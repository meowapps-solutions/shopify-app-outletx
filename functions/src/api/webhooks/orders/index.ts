import {WebhookHandlerFunction} from '@shopify/shopify-api';
import {getJwt} from '../../../shopify.server';
import {SHOPIFY_APP_URL} from '../../../../shopify.app.json';

export const ordersFulfilledWebhookHandler: WebhookHandlerFunction =
  async (_, shopDomain: string, body: string) => {
    const parsedBody = JSON.parse(body);
    const jobId = parsedBody.admin_graphql_api_id.replace('gid://shopify/Order/', 'SHOPIFY_ORDER-');

    await fetch(`https://${SHOPIFY_APP_URL}/api/app/sync?job_id=${jobId}&shop=${shopDomain}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getJwt(shopDomain).token}`,
      },
    });
  };
