import {Rule} from '../firestore/types';
import {SyncData} from '../sync/types';

const checkIfTargeted = (product: SyncData, rule: Rule): boolean => {
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
