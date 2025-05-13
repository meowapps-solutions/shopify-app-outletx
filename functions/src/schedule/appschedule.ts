import {onSchedule} from 'firebase-functions/scheduler';
import {getJwt} from '../shopify.server';
import {SHOPIFY_APP_URL} from '../../shopify.app.json';
import {db} from '../firebase.server';
import {Collection} from '../api/app/firestore/types';

export default onSchedule('every day 00:00', async () => {
  console.log('Running scheduled function every day at 00:00');
  const collection: keyof Collection = 'shopify-settings';
  const doc = await db.collection(collection).get();
  const settings = doc.docs.map((doc) => ({...doc.data(), id: doc.id})) as Collection['shopify-settings'][];

  await Promise.all(settings.filter((setting) => setting.sync_status === 'success')
    .map((setting) => {
      const shopDomain = setting.shop;

      return fetch(`https://${SHOPIFY_APP_URL}/api/app/schedule?shop=${shopDomain}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getJwt(shopDomain).token}`,
        },
      });
    })
  );
});
