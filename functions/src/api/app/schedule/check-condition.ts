import {Rule, Collection} from '../firestore/types';

// Helper function to check if a single condition is met for a product
const checkCondition = (product: Collection['shopify-sync'], condition: Rule['conditions'][0]): boolean => {
  const {type, operator} = condition;
  let productValue: Rule['conditions'][0]['value'] | undefined;
  let conditionValue: Rule['conditions'][0]['value'] = condition.value;

  try {
    switch (type) {
    case 'inventory':
      productValue = Number((product.inventory?.available || 0) / (product.inventory?.total || 1) * 100);
      break;
    case 'inventory_fixed_amount':
      productValue = Number(product.inventory?.available || 0);
      break;
    case 'time_since_launch': {
      const launchDateStr = product.product_created_at; // Assuming createdAt is the launch date
      if (!launchDateStr) return false;
      const launchTime = new Date(launchDateStr).getTime();
      const now = Date.now();
      // Value is likely in days
      productValue = Number((now - launchTime) / (1000 * 60 * 60 * 24));
      break;
    }
    case 'sales_velocity':
      productValue = product.sale_velocity?.monthly;
      break;
    case 'sales_velocity_per_day':
      productValue = product.sale_velocity?.daily;
      break;
    case 'sales_velocity_per_week':
      productValue = product.sale_velocity?.weekly;
      break;
    case 'sales_velocity_per_year':
      productValue = product.sale_velocity?.yearly;
      break;
    case 'tag':
      productValue = product.tags;
      break;
    case 'collection':
      productValue = product.collections?.map((col) => col.replace('gid://shopify/Collection/', ''));
      conditionValue = (conditionValue as string[]).map((col) => col.split(':')[0]);
      break;
    case 'product_type':
      productValue = product.product_type;
      break;
    case 'vendor':
      productValue = product.vendor;
      break;
    case 'price':
      productValue = product.price;
      break;
    case 'time': // Ambiguous - Assuming days since creation for now
      productValue = Date.now();
      conditionValue = new Date(conditionValue as string).getTime();
      break;
    default:
      console.warn(`Unsupported condition type: ${type} for product ${product.id}`);
      return false;
    }

    // --- Check for Undefined Product Value ---
    // (Handles cases like price on product with no variants, or missing inventory data)
    if (productValue === undefined || productValue === null) {
      console.warn(`Product value for type ${type} is undefined/null for product ${product.id}`);
      return false;
    }

    switch (operator) {
    case '=':
      return productValue == conditionValue;
    case '>':
      return productValue > conditionValue;
    case '>=':
      return productValue >= conditionValue;
    case '<':
      return productValue < conditionValue;
    case '<=':
      return productValue <= conditionValue;

    case 'contains':
      if (Array.isArray(productValue) && Array.isArray(conditionValue)) {
        return conditionValue.every((val) => (productValue as string[]).includes(val));
      } else if (Array.isArray(productValue) && typeof conditionValue === 'string') {
        return productValue.includes(conditionValue);
      } else if (typeof productValue === 'string' && Array.isArray(conditionValue)) {
        return conditionValue.includes(productValue);
      } else if (typeof productValue === 'string' && typeof conditionValue === 'string') {
        return productValue.includes(conditionValue);
      }
      return false;
    case 'not_contains':
      if (Array.isArray(productValue) && Array.isArray(conditionValue)) {
        return !conditionValue.some((val) => (productValue as string[]).includes(val));
      } else if (Array.isArray(productValue) && typeof conditionValue === 'string') {
        return !productValue.includes(conditionValue);
      } else if (typeof productValue === 'string' && Array.isArray(conditionValue)) {
        return !conditionValue.includes(productValue);
      } else if (typeof productValue === 'string' && typeof conditionValue === 'string') {
        return !productValue.includes(conditionValue);
      }
      return false; // Invalid comparison
    case 'starts_with':
      return typeof productValue === 'string' &&
          typeof conditionValue === 'string' &&
          productValue.startsWith(conditionValue);
    case 'ends_with':
      return typeof productValue === 'string' &&
          typeof conditionValue === 'string' &&
          productValue.endsWith(conditionValue);

    default:
      console.warn(`Unsupported condition operator: ${operator} for type ${type} on product ${product.id}`);
      return false;
    }
  } catch (error) {
    console.error(`Error checking condition for product ${product.id} and condition type ${type}:`, error);
    return false;
  }
};

export default checkCondition;
