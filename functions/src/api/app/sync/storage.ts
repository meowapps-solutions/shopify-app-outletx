import {db} from '../../../firebase.server';
import {SyncData as Data, Order, ProductVariant} from './types';

export default {
  collection: db.collection('shopify-sync'),
  async storeData(data: Data) {
    const id = data.id;
    const prevData = await this.loadData(id);
    const currentData = {...prevData, ...data};
    await this.collection.doc(id).set(currentData);
    return currentData as Data;
  },
  storeDataOrder(data: Order) {
    return Promise.all(
      data.lineItems.edges.map(async (edge) => {
        const variantId = edge.node.variant?.id;
        if (variantId === undefined) {
          return null;
        }

        const id = this._getId(variantId, data.shop);
        const prevData = await this.loadData(id);
        if (prevData && prevData.orders) {
          prevData.orders = prevData.orders.filter((order) => order.lineItemId !== edge.node.id);
        }
        const newData: Data = {
          ...prevData,
          id,
          shop: data.shop,
          variant_id: variantId,
          orders: [
            ...(prevData?.orders || []),
            {
              id: data.id,
              lineItemId: edge.node.id,
              processedAt: data.processedAt,
              quantity: edge.node.quantity,
            }],
        };
        return this.storeData(newData);
      })
    );
  },
  async storeDataVariant(data: ProductVariant) {
    const id = this._getId(data.id, data.shop);
    const prevData = await this.loadData(id);
    const newData: Data = {
      ...prevData,
      id,
      shop: data.shop,
      variant_id: data.id,
      price: Number(data.price),
      created_at: data.createdAt,
      product_id: data.product.id,
      tags: data.product.tags,
      collections: data.product.collections.edges.map((edge) => edge.node.id),
      product_type: data.product.productType,
      vendor: data.product.vendor,
      inventory_item_id: data.inventoryItem.id,
      inventory_levels: data.inventoryItem.inventoryLevels.edges.map((edge) => ({
        id: edge.node.id,
        quantities: edge.node.quantities.map((quantity) => ({
          id: quantity.id,
          name: quantity.name,
          quantity: quantity.quantity,
        })),
      })),
      triggered_rules: (() => {
        try {
          return JSON.parse(data.triggeredRules?.value || '') || undefined;
        } catch {
          return undefined;
        }
      })(),
    };

    if (newData.triggered_rules === undefined) {
      delete newData.triggered_rules;
    }

    return this.storeData(newData);
  },
  async loadData(id: string) {
    const doc = await this.collection.doc(id).get();
    return doc.data() as Data | undefined;
  },
  async findDataByShop(shop: string) {
    const query = this.collection.where('shop', '==', shop);
    const docs = await query.get();
    return docs.docs.map((doc) => doc.data()) as Data[];
  },
  async deleteDataByProductId(productId: string) {
    const query = this.collection.where('productId', '==', productId);
    const docs = await query.get();
    const batch = db.batch();
    docs.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  },
  _getId(variantId: string, shop: string) {
    return `${variantId.replace('gid://shopify/ProductVariant/', '')}_${shop}`;
  },
};
