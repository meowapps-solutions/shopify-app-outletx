import * as core from 'express-serve-static-core';
import shopify from '../../../shopify.server';
import {GraphqlClient, Session} from '@shopify/shopify-api';
import {Order, ProductVariant, TPageInfo} from './types';
import syncStorage from './storage';

const fetchAllPaginatedGraphQL = async <T>(
  client: GraphqlClient,
  query: string,
  variables: { first: number, after: string | null } = {first: 250, after: null}): Promise<T> => {
  const response = await client.request(
    `#graphql
      query FetchAllPaginatedGraphQL($first: Int!, $after: String) {
        ${query}
      }
    `,
    {variables}
  );
  const {data} = response;

  const _findPathByKey = (obj: object, targetKey: string, path: string[] = []): (string[] | null) => {
    if (
      obj &&
      typeof obj === 'object' &&
      !Array.isArray(obj) &&
      targetKey in obj
    ) {
      return path;
    }

    if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        const result = _findPathByKey(value, targetKey, [...path, key]);
        if (result) return result;
      }
    }

    return null;
  };

  const _getNestedValue = <T>(obj: Record<string, unknown>, pathArray: string[]) => {
    return pathArray.reduce((currentLevel: unknown, key) => {
      return currentLevel && typeof currentLevel === 'object' ?
        (currentLevel as Record<string, unknown>)[key] :
        undefined;
    }, obj) as T;
  };

  await Promise.all(
    Object.keys(data).map(async (key) => {
      const dynamicPath = _findPathByKey(data[key], 'pageInfo');
      if (!dynamicPath) return;

      const dynamicPathWithKey = [key, ...dynamicPath];
      const target = _getNestedValue<TPageInfo>(data, dynamicPathWithKey);
      if (target?.pageInfo?.hasNextPage !== true) return;

      const nextResponse = await fetchAllPaginatedGraphQL<Record<string, unknown>>(client, query, {
        first: variables.first,
        after: target.pageInfo.endCursor,
      });

      const nextTarget = _getNestedValue<TPageInfo>(nextResponse, dynamicPathWithKey);
      if (!nextTarget) return;

      target.edges = [...target.edges, ...nextTarget.edges];
      target.pageInfo = nextTarget.pageInfo;
    }),
  );

  return data;
};

// // Start the sync process
// fetch('/api/app/sync/start', {
//   method: 'POST',
// })
//   .then((res) => res.json())
//   .then((data) => {
//     console.log('Sync started:', data);

//     // Iterate over the returned job IDs and process each one
//     data.data.forEach((jobId: string) => {
//       fetch('/api/app/sync?job_id=' + jobId, {
//         method: 'POST',
//       })
//         .then((res) => res.json())
//         .then((jobData) => {
//           console.log('Job processed:', jobId, jobData);
//         })
//         .catch((err) => {
//           console.error('Error processing job:', jobId, err);
//         });
//     });
//   })
//   .catch((err) => {
//     console.error('Error starting sync:', err);
//   });
export default (app: core.Express) => {
  app.get('/api/app/sync-data', async (req, res) => {
    const {shop: shop} = req.query as { shop?: string };
    if (shop === undefined) {
      res.status(400).json({error: 'Missing shop'});
      return;
    }
    const syncData = await syncStorage.findDataByShop(shop);
    res.status(200).json({data: syncData});
  });
  app.post('/api/app/sync/start', async (req, res) => {
    const session = res.locals.shopify.session;
    const client = new shopify.api.clients.Graphql({session});

    const {orders, productVariants} = await fetchAllPaginatedGraphQL<{
      orders: {
        edges: Array<{ node: { id: string } }>;
      },
      productVariants: {
        edges: Array<{ node: { id: string } }>;
      }
    }>(client, `
      orders(first: $first, after: $after, query: "fulfillment_status:fulfilled") {
        edges {
          node {
            id
          }
        }
        pageInfo {
          endCursor
          hasNextPage
        }
      }
      
      productVariants(first: $first, after: $after) {
        edges {
          node {
            id
          }
        }
        pageInfo {
          endCursor
          hasNextPage
        }
      }
    `);

    res.json({
      data: [
        ...orders.edges.map((edge: { node: { id: string } }) => edge.node.id)
          .map((id: string) => id.replace('gid://shopify/Order/', 'SHOPIFY_ORDER-')),
        ...productVariants.edges.map((edge: { node: { id: string } }) => edge.node.id)
          .map((id: string) => id.replace('gid://shopify/ProductVariant/', 'SHOPIFY_VARIANT-')),
      ],
    });
  });

  app.post('/api/app/sync', async (req, res) => {
    const {job_id: jobId} = req.query as { job_id?: string };
    const session = res.locals.shopify.session as Session;
    const client = new shopify.api.clients.Graphql({session});

    if (jobId?.startsWith('SHOPIFY_ORDER-')) {
      const id = jobId.replace('SHOPIFY_ORDER-', 'gid://shopify/Order/');
      const {order} = await fetchAllPaginatedGraphQL<{ order: Order }>(client, `order(id: "${id}") {
        id
        lineItems(first: $first, after: $after) {
          edges {
            node {
              id
              quantity
              variant {
                id
              }
            }
          }
          pageInfo {
            endCursor
            hasNextPage
          }
        }
        processedAt
      }`);

      const syncId = await syncStorage.storeDataOrder({...order, shop: session.shop});

      res.status(200).json({data: {id: syncId, status: 'COMPLETED'}});
    } else if (jobId?.startsWith('SHOPIFY_VARIANT-')) {
      const id = jobId.replace('SHOPIFY_VARIANT-', 'gid://shopify/ProductVariant/');
      const {productVariant: productVariantWithProduct} =
        await fetchAllPaginatedGraphQL<{ productVariant: ProductVariant }>(client, `productVariant(id: "${id}") {
        id
        price
        createdAt
        triggeredRules: metafield(namespace: "outletx", key: "triggered_rules") {
          value
        }
        product {
          id
          tags
          collections(first: $first, after: $after) {
            edges {
              node {
                id
                title
              }
            }
            pageInfo {
              endCursor
              hasNextPage
            }
          }
          productType
          vendor
        }
      }`);
      const {productVariant: productVariantWithInventory} =
        await fetchAllPaginatedGraphQL<{ productVariant: ProductVariant }>(client, `productVariant(id: "${id}") {
        id
        inventoryItem {
          id
          inventoryLevels(first: $first, after: $after) {
            edges {
              node {
                id
                quantities(names: "on_hand") {
                  id
                  name
                  quantity
                }
              }
            }
            pageInfo {
              endCursor
              hasNextPage
            }
          }
        }
      }`);

      const syncId = await syncStorage.storeDataVariant({
        ...productVariantWithProduct,
        ...productVariantWithInventory,
        shop: session.shop,
      });

      res.status(200).json({data: {id: syncId, status: 'COMPLETED'}});
    } else {
      res.status(400).json({error: 'Invalid job ID'});
    }
  });
};
