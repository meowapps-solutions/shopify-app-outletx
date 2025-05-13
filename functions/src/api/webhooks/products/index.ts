import {WebhookHandlerFunction} from '@shopify/shopify-api';
import {getJwt} from '../../../shopify.server';
import {SHOPIFY_APP_URL} from '../../../../shopify.app.json';
import syncStorage from '../../app/sync/storage';

export const productsUpdateWebhookHandler: WebhookHandlerFunction =
  async (_, shopDomain: string, body: string) => {
    const parsedBody = JSON.parse(body);

    await Promise.all(
      parsedBody.variant_gids.map(async (variant: { admin_graphql_api_id: string }) => {
        const jobId = variant.admin_graphql_api_id.replace('gid://shopify/ProductVariant/', 'SHOPIFY_VARIANT-');

        await fetch(`https://${SHOPIFY_APP_URL}/api/app/sync?job_id=${jobId}&shop=${shopDomain}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getJwt(shopDomain).token}`,
          },
        });
      })
    );
  };

export const productsDeleteWebhookHandler: WebhookHandlerFunction =
  async (topic: string, shopDomain: string, body: string) => {
    const {id} = JSON.parse(body);
    await syncStorage.deleteDataByProductId('gid://shopify/Product/' + id);
  };
