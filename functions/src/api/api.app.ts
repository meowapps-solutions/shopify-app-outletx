import {onRequest} from 'firebase-functions/v2/https';
import express from 'express';
import shopify from '../shopify.server';
import firestoreRoutes from './app/firestore';

const app = express();

app.use(shopify.validateAuthenticatedSession());

app.get('/api/app/', (_, res) => {
  res.send('Hello world!');
});

firestoreRoutes(app);

export default onRequest(app);
