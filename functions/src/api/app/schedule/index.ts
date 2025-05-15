import * as core from 'express-serve-static-core';
import {GraphqlClient, Session} from '@shopify/shopify-api';
import syncStorage from '../sync/storage';
import calculateInventory from './calculate-inventory';
import calculateSaleVelocity from './calculate-saleVelocity';
import {Collection, Rule, SyncData} from '../firestore/types';
import shopify, {getJwt} from '../../../shopify.server';
import {SHOPIFY_APP_URL} from '../../../../shopify.app.json';

// Helper function to check if a product is targeted by a rule with specific targeting
import checkCondition from './check-condition';
import checkIfTargeted from './check-if-targeted';
import {storage} from '../firestore';

export default (app: core.Express) => {
  app.post('/api/app/schedule', async (req, res) => {
    const {shop} = req.query as { shop?: string };
    if (!shop) {
      return res.status(400).json({error: 'Shop not provided'});
    }

    try {
      // --- Fetch Data ---
      const storageInstance = storage(shop);
      const rules = await storageInstance.getAll('shopify-rules');
      const setting = await storageInstance.get('shopify-settings', shop);
      const products = await syncStorage.findDataByShop(shop);
      console.log(`Processing ${products.length} products against ${rules.length} rules for shop ${shop}.`);

      const matchedProducts: { product: Collection['shopify-sync'], matchingRules: Rule[] }[] = [];

      // --- Process Each Product ---
      await Promise.all(products.map(async (product: Collection['shopify-sync']) => {
        product.inventory = calculateInventory(product);
        product.sale_velocity = calculateSaleVelocity(product.orders);

        const matchingRulesApplied: typeof rules = [];

        // --- Check Product Against Each Active Rule ---
        rules.forEach((rule) => {
          // If the rule is not active, skip it
          if (rule.status !== 'active') {
            return;
          }

          // If this product has triggered the same rule before, skip it
          if (product.triggered_rules?.some((item) => item.id === rule.id)) {
            return;
          }

          // Check if the product is targeted by the rule
          if (!checkIfTargeted(product, rule, setting)) {
            return; // Skips rule if product is not targeted
          }

          // Evaluate all conditions for the rule based on condition_logic
          let allConditionsMet = false;
          const conditionResults = rule.conditions.map((condition) => checkCondition(product, condition));

          if (rule.condition_logic === 'all') {
            allConditionsMet = conditionResults.every((result) => result === true);
          } else { // ConditionLogic.Any
            allConditionsMet = conditionResults.some((result) => result === true);
          }

          // --- Action if Conditions Met ---
          if (allConditionsMet) {
            console.info(`Product ${product.id} matches Rule ${rule.id} ("${rule.name}")`);
            matchingRulesApplied.push(rule);
          }
        }); // End of rules.forEach

        // Optional: Collect products that matched at least one rule
        if (matchingRulesApplied.length > 0) {
          matchingRulesApplied.forEach((rule) => {
            try {
              // *** CALL THE NON-BLOCKING FUNCTION ***
              fetch(`https://${SHOPIFY_APP_URL}/api/app/schedule/trigger/${product.id}/${rule.id}`, {
                method: 'POST',
                headers: {'Authorization': `Bearer ${getJwt(shop).token}`},
              });
            } catch (criticalError) {
              console.error(
                `Critical error while applying rule ${rule.id} to product ${product.id}:`,
                criticalError
              );
            }
          });

          matchedProducts.push({
            product: product,
            matchingRules: matchingRulesApplied,
          });
        }
      })); // End of products.forEach

      console.log(`Processing complete. ${matchedProducts.length} products matched one or more active rules.`);

      // You might want to return the list of matched products and the rules they matched
      return res.status(200).json({
        message: 'Schedule processed successfully.',
        matchedCount: matchedProducts.length,
        matchedProducts: matchedProducts,
      });
    } catch (error) {
      console.error(`Error during schedule execution for shop ${shop}:`, error);
      return res.status(500).json({error: 'Internal server error during schedule execution.'});
    }
  });
  app.post('/api/app/schedule/trigger/:syncId/:ruleId', async (req, res) => {
    const {syncId, ruleId} = req.params;
    const session = res.locals.shopify.session as Session;
    const client = new shopify.api.clients.Graphql({session});
    const storageInstance = storage(session.shop);
    const [syncData, rule] = await Promise.all([
      syncStorage.loadData(syncId),
      storageInstance.get('shopify-rules', ruleId),
    ]);

    if (!syncData || !rule) {
      return res.status(404).json({error: 'Sync data or rule not found'});
    }

    const reports: NonNullable<SyncData['triggered_rules']>[0]['reports'] = [];
    for (const trigger of rule.trigger) {
      try {
        const triggeredRuleReport = await applyTrigger(client, syncData, trigger);
        reports.push(triggeredRuleReport);
      } catch (error) {
        console.error(`Error applying trigger ${trigger.type} to variant ${syncData.variant_id}:`, error);
        reports.push({
          type: trigger.type,
          error_message: (error as Error).message,
        });
      }
    }

    await updateProductMetafields(client, syncData, {
      id: rule.id,
      created_at: new Date().toISOString(),
      reports: reports,
    });

    // update the last_triggered_at field in the rule
    await storageInstance.set('shopify-rules', ruleId, {
      ...rule,
      last_triggered_at: new Date().toISOString(),
    });

    return res.status(200).json({
      message: `Trigger applied successfully to product ${syncId} with rule ${ruleId}`,
      syncData: syncData,
      rule: rule,
    });
  });
  // revert
  // input ruleid and syncid
  // output:
  // - revert the trigger
  // - delete the triggered rule from the metafield
  // - delete the triggered rule from sync
  // - block sync run with this rule
  app.post('/api/app/schedule/revert/:syncId/:ruleId', async (req, res) => {
    const {syncId, ruleId} = req.params;
    const session = res.locals.shopify.session as Session;
    const client = new shopify.api.clients.Graphql({session});
    const storageInstance = storage(session.shop);
    const [syncData, rule] = await Promise.all([
      syncStorage.loadData(syncId),
      storageInstance.get('shopify-rules', ruleId),
    ]);

    if (!syncData || !rule) {
      return res.status(404).json({error: 'Sync data or rule not found'});
    }

    const triggeredRules = syncData.triggered_rules?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const triggeredRuleIndex = triggeredRules?.findIndex((item) => item.id === ruleId);

    if (triggeredRuleIndex === undefined || triggeredRuleIndex < 0) {
      return res.status(404).json({error: 'Triggered rule not found'});
    }

    // Revert the trigger
    for (const rule of triggeredRules?.filter((_, index) => index <= triggeredRuleIndex) || []) {
      for (const report of rule.reports) {
        try {
          await revertTrigger(client, syncData, report);
        } catch (error) {
          console.error(`Error reverting trigger ${report.type} to variant ${syncData.variant_id}:`, error);
          return res.status(500).json({error: `Error reverting trigger ${report.type} to variant ${syncData.variant_id}: ${(error as Error).message}`});
        }
      }
    }

    // // Remove the triggered rule from the metafield
    await updateProductMetafields(client, syncData, {
      id: rule.id,
      created_at: new Date().toISOString(),
      reports: [],
    });

    // Remove the triggered rule from sync
    const newTriggeredRules = syncData.triggered_rules?.filter((item) => item.id !== rule.id) || [];
    await storageInstance.set('shopify-sync', syncId, {...syncData, triggered_rules: newTriggeredRules});

    // Block sync run with this rule
    const excludedProducts = (() => {
      const excludedProducts = rule.excluded_products || [];
      const existingProduct = excludedProducts.find((item) => item.id === syncData.product_id);
      if (existingProduct) {
        return excludedProducts.map((item) => {
          if (item.id === syncData.product_id) {
            return {...item, variants: [...(item.variants || []), syncData.variant_id]};
          }
          return item;
        });
      } else {
        return [...excludedProducts, {id: syncData.product_id as string, variants: [syncData.variant_id]}];
      }
    })();
    await storageInstance.set('shopify-rules', ruleId, {...rule, excluded_products: excludedProducts});

    return res.status(200).json({message: `Trigger reverted successfully for product ${syncId} with rule ${ruleId}`});
  });
};

const applyTrigger = async (
  client: GraphqlClient,
  syncData: SyncData,
  trigger: Rule['trigger'][0]
): Promise<NonNullable<SyncData['triggered_rules']>[0]['reports'][0]> => {
  console.info(`Applying trigger type ${trigger.type} to variant ${syncData.variant_id}`);

  if (trigger.type === 'discount' || trigger.type === 'discount_fixed_amount') {
    const config = trigger.config;
    const {compareAtPrice, price} = await (async () => {
      const response = await client.request(
        `#graphql
          query ProductVariant($id: ID!) {
            productVariant(id: $id) {
              compareAtPrice
              price
            }
          }
        `,
        {
          variables: {
            'id': syncData.variant_id,
          },
        }
      );

      return {compareAtPrice: response.data.productVariant.compareAtPrice || response.data.productVariant.price, price: response.data.productVariant.price};
    })();
    const newPrice = Math.max((() => {
      if (trigger.type === 'discount') {
        return Math.round((parseFloat(compareAtPrice) * (100 - (config.value as number))) / 100);
      }
      return Math.round(parseFloat(compareAtPrice) - (config.value as number));
    })(), config.options?.min_price || 0);
    const response = await client.request(
      `#graphql
        mutation ProductVariantsUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkUpdate(productId: $productId, variants: $variants) {
            productVariants {
              compareAtPrice
              price
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      {
        variables: {
          productId: syncData.product_id,
          variants: [
            {
              id: syncData.variant_id,
              compareAtPrice: compareAtPrice,
              price: newPrice,
            },
          ],
        },
      }
    );

    if (response.data.productVariantsBulkUpdate.userErrors.length > 0) {
      throw new Error(response.data.productVariantsBulkUpdate.userErrors[0].message);
    }

    console.info(`Discount applied to variant ${syncData.variant_id}: new price is ${newPrice}`);

    return {
      type: trigger.type,
      backup_value: price,
      new_value: newPrice,
    };
  } else if (trigger.type === 'move_to_collection') {
    const config = trigger.config;
    const response = await client.request(
      `#graphql
        mutation collectionAddProductsV2($id: ID!, $productIds: [ID!]!) {
          collectionAddProductsV2(id: $id, productIds: $productIds) {
            job {
              done
              id
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      {
        variables: {
          'id': config.value,
          'productIds': [syncData.product_id],
        },
      }
    );

    if (response.data.collectionAddProductsV2.userErrors.length > 0) {
      throw new Error(response.data.collectionAddProductsV2.userErrors[0].message);
    }

    console.info(`Product ${syncData.product_id} added to collection ${config.value}`);

    return {
      type: 'move_to_collection',
      new_value: config.value,
    };
  } else if (trigger.type === 'add_tag') {
    const config = trigger.config;
    const response = await client.request(
      `#graphql
        mutation addTags($id: ID!, $tags: [String!]!) {
          tagsAdd(id: $id, tags: $tags) {
            node {
              id
            }
            userErrors {
              message
            }
          }
        }
      `,
      {
        variables: {
          id: syncData.product_id,
          tags: [config.value],
        },
      }
    );

    if (response.data.tagsAdd.userErrors.length > 0) {
      throw new Error(response.data.tagsAdd.userErrors[0].message);
    }

    console.info(`Tag ${config.value} added to variant ${syncData.variant_id}`);

    return {
      type: 'add_tag',
      new_value: config.value,
    };
  }

  throw new Error(`Unsupported trigger ${trigger.type}`);
};

const revertTrigger = async (
  client: GraphqlClient,
  syncData: SyncData,
  report: NonNullable<SyncData['triggered_rules']>[0]['reports'][0]
): Promise<void> => {
  console.info(`Reverting trigger type ${report.type} to variant ${syncData.variant_id}`);
  if (report.type === 'discount' || report.type === 'discount_fixed_amount') {
    const response = await client.request(
      `#graphql
        mutation ProductVariantsUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkUpdate(productId: $productId, variants: $variants) {
            productVariants {
              compareAtPrice
              price
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      {
        variables: {
          productId: syncData.product_id,
          variants: [
            {
              id: syncData.variant_id,
              price: report.backup_value,
            },
          ],
        },
      }
    );
    if (response.data.productVariantsBulkUpdate.userErrors.length > 0) {
      throw new Error(response.data.productVariantsBulkUpdate.userErrors[0].message);
    }
    console.info(`Discount reverted for variant ${syncData.variant_id}: new price is ${report.backup_value}`);
  } else if (report.type === 'move_to_collection') {
    const response = await client.request(
      `#graphql
        mutation collectionRemoveProducts($id: ID!, $productIds: [ID!]!) {
          collectionRemoveProducts(id: $id, productIds: $productIds) {
            job {
              done
              id
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      {
        variables: {
          id: report.new_value,
          productIds: [syncData.product_id],
        },
      }
    );
    if (response.data.collectionRemoveProducts.userErrors.length > 0) {
      throw new Error(response.data.collectionRemoveProducts.userErrors[0].message);
    }
    console.info(`Product ${syncData.product_id} removed from collection ${report.new_value}`);
  } else if (report.type === 'add_tag') {
    const response = await client.request(
      `#graphql
        mutation removeTags($id: ID!, $tags: [String!]!) {
          tagsRemove(id: $id, tags: $tags) {
            node {
              id
            }
            userErrors {
              message
            }
          }
        }
      `,
      {
        variables: {
          id: syncData.product_id,
          tags: [report.new_value],
        },
      }
    );
    if (response.data.tagsRemove.userErrors.length > 0) {
      throw new Error(response.data.tagsRemove.userErrors[0].message);
    }
    console.info(`Tag ${report.new_value} removed from variant ${syncData.variant_id}`);
  } else {
    throw new Error(`Unsupported trigger ${report.type}`);
  }
};

const updateProductMetafields = async (client: GraphqlClient, syncData: SyncData, triggeredRule: NonNullable<SyncData['triggered_rules']>[0]) => {
  const oldValue: NonNullable<SyncData['triggered_rules']> = await (async () => {
    try {
      const response = await client.request(
        `#graphql
          query ProductVariantMetafield($namespace: String!, $key: String!, $ownerId: ID!) {
            productVariant(id: $ownerId) {
              triggeredRules: metafield(namespace: $namespace, key: $key) {
                value
              }
            }
          }
        `,
        {
          variables: {
            namespace: 'outletx',
            key: 'triggered_rules',
            ownerId: syncData.variant_id,
          },
        }
      );

      return JSON.parse(response.data.productVariant.triggeredRules?.value) || [];
    } catch (error) {
      console.error(error);
      return [];
    }
  })();
  const newValue: SyncData['triggered_rules'] = (() => {
    if (triggeredRule.reports.length === 0) {
      return oldValue.filter((item) => item.id !== triggeredRule.id);
    }
    return [...oldValue, triggeredRule];
  })();
  const response = await client.request(
    `#graphql
      mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) {
          userErrors {
            field
            message
          }
        }
      }
    `,
    {
      variables: {
        productId: syncData.product_id,
        variants: [
          {
            id: syncData.variant_id,
            metafields: [
              {
                namespace: 'outletx',
                key: 'triggered_rules',
                type: 'single_line_text_field',
                value: JSON.stringify(newValue),
              },
            ],
          },
        ],
      },
    }
  );

  if (response.data.productVariantsBulkUpdate.userErrors.length > 0) {
    throw new Error(response.data.productVariantsBulkUpdate.userErrors[0].message);
  }
};
