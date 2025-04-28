import * as core from 'express-serve-static-core';
import {db} from '../../firebase.server';
import {Session} from '@shopify/shopify-api';
import {Collection, DefaultField} from '../../firebase/firestore/types';

export default (app: core.Express) => {
  // --- Create (POST) ---
  app.post('/api/app/firestore/:collectionName', async (req, res) => {
    const session = res.locals.shopify.session as Session;
    const {collectionName} = req.params as { collectionName: keyof Collection };
    const data = req.body as Omit<Collection[keyof Collection], keyof DefaultField>;
    const response = await db.collection(collectionName).create({...data, shop: session.shop});
    res.status(201).json(response);
  });

  // --- Get (GET) ---
  app.get('/api/app/firestore/:collectionName/:docId', async (req, res) => {
    const session = res.locals.shopify.session as Session;
    const {collectionName, docId} = req.params as { collectionName: keyof Collection, docId: string };
    const response = await db.collection(collectionName).read(docId);
  });

  // --- Get all (GET) ---
  app.get('/api/app/firestore/:collectionName', async (req, res) => {
    const session = res.locals.shopify.session as Session;
    const {collectionName} = req.params;
    const {limit, offset, sortBy, sortDirection} = req.query as FirestoreQueryParams;
    const where = req.query.where ? JSON.parse(req.query.where as string) as FirestoreQueryParams['where'] : null;

    let query = db.collection(collectionName)
      .where('shop', '==', session.shop);

    if (where) {
      Object.entries(where).forEach(([key, value]) => {
        if (typeof value === 'object' && !Array.isArray(value)) {
          Object.entries(value).forEach(([operator, filterValue]) => {
            if (filterValue) {
              query = query.where(key, operator as WhereFilterOp, filterValue);
            }
          });
        } else {
          query = query.where(key, '==', value);
        }
      });
    }

    if (limit && !isNaN(Number(limit))) {
      query = query.limit(Number(limit));
    }

    if (offset && !isNaN(Number(offset))) {
      query = query.offset(Number(offset));
    }

    if (sortBy) {
      const direction = sortDirection === 'desc' ? 'desc' : 'asc';
      query = query.orderBy(sortBy, direction);
    }

    const querySnapshot = await query.get();
    const documents: unknown[] = [];
    querySnapshot.forEach((doc) => {
      documents.push({id: doc.id, ...doc.data()});
    });
    res.status(200).json(documents);
  });

  // --- Update (PUT) ---
  app.put('/api/app/firestore/:collectionName/:docId', async (req, res) => {
    const session = res.locals.shopify.session as Session;
    const {collectionName, docId} = req.params;
    const data = req.body;

    if (!data || Object.keys(data).length === 0) {
      res.status(400).json({error: 'Bad Request: No data provided in body.'});
      return;
    }

    // Ensure the shop field cannot be updated via this route
    if (data.shop) {
      delete data.shop;
    }

    const docRef = db.collection(collectionName).doc(docId);

    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      res.status(404).json({error: 'Document not found'});
      return;
    }
    const existingData = docSnap.data();
    if (existingData?.shop && existingData.shop !== session.shop) {
      res.status(403).json({error: 'Forbidden: You can only update documents belonging to your shop.'});
      return;
    }

    const dataToUpdate = {
      ...data,
      updated_at: new Date().toISOString(),
    };
    await docRef.update(dataToUpdate);

    res.status(200).json({id: docRef.id, ...dataToUpdate});
  });

  // --- Delete (DELETE) ---
  app.delete('/api/app/firestore/:collectionName/:docId', async (req, res) => {
    const session = res.locals.shopify.session as Session;
    const {collectionName, docId} = req.params;

    const docRef = db.collection(collectionName).doc(docId);

    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      res.status(204).send();
      return;
    }
    const existingData = docSnap.data();
    if (existingData?.shop && existingData.shop !== session.shop) {
      res.status(403).json({error: 'Forbidden: You can only delete documents belonging to your shop.'});
      return;
    }

    await docRef.delete();
    res.status(204).send();
  });
};
