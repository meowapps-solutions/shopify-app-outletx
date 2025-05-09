import {Rule, Setting, Collection} from '../firestore/types';

const checkIfTargeted = (product: Collection['shopify-sync'], rule: Rule, setting: Setting | null): boolean => {
  // Check if the product is excluded
  if (setting?.excluded_products?.length) {
    const excludedProduct = setting.excluded_products.find((excluded) => excluded.id === product.product_id);
    if (excludedProduct) {
      if (excludedProduct.variants?.length) {
        const isExcluded = excludedProduct.variants.some((variant) => variant === product.variant_id);
        if (isExcluded) {
          console.warn(`Product ${product.id} is excluded by variant ${product.variant_id} in rule ${rule.name}.`);
          return false;
        }
      } else {
        console.warn(`Product ${product.id} is excluded by rule ${rule.name}.`);
        return false;
      }
    }
  }

  // Check if the collection is excluded
  if (setting?.excluded_collections?.length) {
    const excludedCollection = setting.excluded_collections.find((excluded) => product.collections?.includes(excluded.id));
    if (excludedCollection) {
      console.warn(`Product ${product.id} is excluded by collection ${excludedCollection.id} in rule ${rule.name}.`);
      return false;
    }
  }

  // Check with apply_scope
  if (rule.apply_scope === 'all') {
    return true;
  }

  const scopeTargets = rule.scope_targets || [];

  if (scopeTargets.length === 0) {
    console.warn(`Rule ${rule.name} has no scope targets.`);
    return false;
  }

  let productMatch = false;
  if (scopeTargets.length > 0 && rule.apply_scope === 'products') {
    productMatch = scopeTargets.some((target) =>
      target.variants?.some((variant) => variant === product.variant_id)
    );
  }

  let collectionMatch = false;
  if (scopeTargets.length > 0 && rule.apply_scope === 'collections') {
    if (product.collections?.length === 0 && scopeTargets.length > 0) {
      console.warn(`Cannot check collection targeting for product ${product.id}: product.collections data missing.`);
    } else {
      collectionMatch = scopeTargets.some((targetCol) => product.collections?.includes(targetCol.id));
    }
  }

  if (scopeTargets.length > 0) {
    return productMatch || collectionMatch;
  }

  return false;
};

export default checkIfTargeted;
