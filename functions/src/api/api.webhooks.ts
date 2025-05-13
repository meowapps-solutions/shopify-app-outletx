/* eslint-disable @typescript-eslint/no-explicit-any */
import {onRequest} from 'firebase-functions/v2/https';
import {WebhookHandlersParam} from '@shopify/shopify-app-express';
import {DeliveryMethod} from '@shopify/shopify-api';
import express from 'express';
import shopify from '../shopify.server';
import {cookieStorage} from './api.auth';
import {
  productsDeleteWebhookHandler,
  productsUpdateWebhookHandler,
} from './webhooks/products';
import {ordersFulfilledWebhookHandler} from './webhooks/orders';

const app = express();

// IMPORTANT: Ensure that any changes to the webhooks listed below are reflected
// in the [[webhooks.subscriptions]] section of the `shopify.app.toml` file.
// This is required to properly register or deregister webhooks with Shopify.
// Reference: https://shopify.dev/docs/api/admin-graphql/latest/enums/WebhookSubscriptionTopic
const webhookHandlers: WebhookHandlersParam = {
  APP_UNINSTALLED: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: shopify.config.webhooks.path,
    callback: async (_, shopDomain: string) => {
      await cookieStorage.deleteCookie(shopDomain);
    },
  },
  PRODUCTS_CREATE: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: shopify.config.webhooks.path,
    callback: productsUpdateWebhookHandler,
  },
  PRODUCTS_DELETE: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: shopify.config.webhooks.path,
    callback: productsDeleteWebhookHandler,
  },
  PRODUCTS_UPDATE: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: shopify.config.webhooks.path,
    callback: productsUpdateWebhookHandler,
  },
  ORDERS_FULFILLED: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: shopify.config.webhooks.path,
    callback: ordersFulfilledWebhookHandler,
  },
};

app.post(shopify.config.webhooks.path, express.json({
  verify: (req, res, buf, encoding) => {
    if (buf && buf.length) {
      (req as any).rawBody = buf.toString(encoding as BufferEncoding || 'utf8');
    }
  },
  limit: '10mb',
}));

app.post(shopify.config.webhooks.path, express.urlencoded({
  extended: true,
  verify: (req, res, buf, encoding) => {
    if (buf && buf.length) {
      (req as any).rawBody = buf.toString(encoding as BufferEncoding || 'utf8');
    }
  },
  limit: '10mb',
}));

app.post(shopify.config.webhooks.path, (req, res, next) => {
  req.body = (req as any).rawBody;
  next();
});

app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({webhookHandlers}),
);

export default onRequest(app);
