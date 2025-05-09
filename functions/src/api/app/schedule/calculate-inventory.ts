import {SyncData} from '../firestore/types';

const calculateInventory = (data: SyncData): SyncData['inventory'] => {
  const inventoryFromOrder = data.orders?.reduce((acc, order) => {
    return acc + order.quantity;
  }, 0) || 0;
  const inventoryFromVariant = data.inventory_levels?.reduce((acc, inventoryLevel) => {
    return acc + (inventoryLevel.quantities.find(({name}) => name === 'on_hand')?.quantity || 0);
  }, 0) || 0;

  return {
    available: inventoryFromVariant,
    total: inventoryFromOrder + inventoryFromVariant,
  };
};

export default calculateInventory;
