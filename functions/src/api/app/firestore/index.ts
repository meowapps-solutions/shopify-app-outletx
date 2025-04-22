import * as core from 'express-serve-static-core';
import {db} from '../../../firebase.server';
import {Session} from '@shopify/shopify-api';

export default (app: core.Express) => {
  // --- Create (POST) ---
  app.post('/api/app/firestore/:collectionName', async (req, res) => {
    const session = res.locals.shopify.session as Session;
    const {collectionName} = req.params;
    const data = req.body;

    if (!data || Object.keys(data).length === 0) {
      res.status(400).json({error: 'Bad Request: No data provided in body.'});
      return;
    }

    const dataToSave = {
      ...data,
      shop: session.shop,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Ensure the ID field cannot be added directly
    if (dataToSave.id) {
      delete dataToSave.id;
    }

    const docRef = await db.collection(collectionName).add(dataToSave);
    res.status(201).json({id: docRef.id, ...dataToSave});
  });

  // --- Get (GET) ---
  app.get('/api/app/firestore/:collectionName/:docId', async (req, res) => {
    const session = res.locals.shopify.session as Session;
    const {collectionName, docId} = req.params;
    const docRef = db.collection(collectionName).doc(docId);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      const data = docSnap.data();
      if (data?.shop && data.shop !== session.shop) {
        res.status(403).json({error: 'Forbidden: Access denied'});
        return;
      }
      res.status(200).json({id: docSnap.id, ...data});
    } else {
      res.status(404).json({error: 'Document not found'});
    }
  });

  // --- Get all (GET) ---
  app.get('/api/app/firestore/:collectionName', async (req, res) => {
    const session = res.locals.shopify.session as Session;
    const {collectionName} = req.params;
    const {limit}: {
      limit?: string;
    } = req.query;

    let query = db.collection(collectionName)
      .where('shop', '==', session.shop);

    if (limit && !isNaN(parseInt(limit))) {
      query = query.limit(parseInt(limit));
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

    res.status(200).json({message: 'Document updated successfully', id: docId});
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
