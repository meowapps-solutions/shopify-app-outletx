import * as core from 'express-serve-static-core';
import {db} from '../../../firebase.server';
import {Collection, DefaultField} from './types';
import {Session} from '@shopify/shopify-api';

export const storage = (shop: string) => ({
  get: async <T extends keyof Collection>(collection: T, id: string): Promise<Collection[T] | null> => {
    const doc = await db.collection(collection).doc(id).get();
    return doc.exists ? {...doc.data() as Collection[T], id: doc.id} : null;
  },
  set: async <T extends keyof Collection>(collection: T, id: string, data: Partial<Omit<Collection[T], keyof DefaultField>>): Promise<void> => {
    const newData: typeof data & DefaultField = {...data, id, shop, updated_at: new Date().toISOString()};
    await db.collection(collection).doc(id).set(newData);
  },
  delete: async <T extends keyof Collection>(collection: T, id: string): Promise<void> => {
    await db.collection(collection).doc(id).delete();
  },
  getAll: async <T extends keyof Collection>(collection: T): Promise<Collection[T][]> => {
    const doc = await db.collection(collection).where('shop', '==', shop).get();
    return doc.docs.map((doc) => ({...doc.data() as Collection[T], id: doc.id}));
  },
  getAllBy: async <T extends keyof Collection>(collection: T, filter: { [K in keyof Partial<Collection[T]>]: string | number | boolean | string[] | number[]; },): Promise<Collection[T][]> => {
    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection(collection).where('shop', '==', shop);

    for (const key in filter) {
      if (Object.prototype.hasOwnProperty.call(filter, key)) {
        const value = filter[key as keyof Collection[T]];
        if (value) {
          query = query.where(key, '==', value);
        } else {
          query = query.where(key, '!=', null);
        }
      }
    }

    const querySnapshot = await query.get();
    return querySnapshot.docs.map((doc) => ({...doc.data() as Collection[T], id: doc.id}));
  },
});

export default (app: core.Express) => {
  app.post('/api/app/firestore/:collection/:id', async (req, res) => {
    const {shop} = res.locals.shopify.session as Session;
    const {collection, id} = req.params;
    const storageInstance = storage(shop);
    await storageInstance.set(collection as keyof Collection, id, req.body);
    res.status(204).end();
  });

  app.get('/api/app/firestore/:collection', async (req, res) => {
    const {shop} = res.locals.shopify.session as Session;
    const {collection} = req.params;
    const storageInstance = storage(shop);

    const queryParams = req.query;
    if (Object.keys(queryParams).length > 0) {
      const filter: { [key: string]: unknown } = {};
      for (const key in queryParams) {
        if (Object.prototype.hasOwnProperty.call(queryParams, key)) {
          filter[key as string] = queryParams[key] as string | string[];
        }
      }
      try {
        const data = await storageInstance.getAllBy(collection as keyof Collection, filter);
        res.status(200).json(data);
      } catch (error) {
        console.error('Error fetching filtered data:', error);
        res.status(500).json({error: 'Failed to fetch filtered data'});
      }
    } else {
      const data = await storageInstance.getAll(collection as keyof Collection);
      res.status(200).json(data);
    }
  });

  app.get('/api/app/firestore/:collection/:id', async (req, res) => {
    const {shop} = res.locals.shopify.session as Session;
    const {collection, id} = req.params;
    const storageInstance = storage(shop);
    const data = await storageInstance.get(collection as keyof Collection, id);
    if (data) {
      res.status(200).json(data);
    } else {
      res.status(404).end();
    }
  });

  app.delete('/api/app/firestore/:collection/:id', async (req, res) => {
    const {shop} = res.locals.shopify.session as Session;
    const {collection, id} = req.params;
    const storageInstance = storage(shop);
    await storageInstance.delete(collection as keyof Collection, id);
    res.status(204).end();
  });
};
