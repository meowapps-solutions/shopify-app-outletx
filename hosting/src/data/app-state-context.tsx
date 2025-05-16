import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Icon, InlineStack } from '@shopify/polaris';
import { RefreshIcon } from '@shopify/polaris-icons';
import { Collection, Rule, Setting, SyncData } from '../../../functions/src/api/app/firestore/types';
import { useFetch } from '../hooks/http-client';

type TContext = {
  rules: Record<string, Rule | undefined>;
  settings: Record<string, Setting | undefined>;
  syncData: Record<string, SyncData | undefined>;
  shop: string;
  cacheRef: React.MutableRefObject<Record<string, unknown | undefined>>;
  getProductVariant: (variant_id: string) => Promise<{ id: string; title: string; product: { title: string } }>;
  getSyncData: (forceRefresh?: boolean) => Promise<Collection['shopify-sync'][]>;
  getLastTriggered: (ruleId: 'new' | string) => Promise<({ productVariant: Awaited<ReturnType<TContext['getProductVariant']>> } & Collection['shopify-sync'])[]>;
  getShopifyCollection: (id: string) => Promise<{ id: string; title: string; image: { url: string } }>;
}

const AppStateContext = createContext<TContext | undefined>(undefined);

export const AppStateProvider = ({ children }: { children: React.ReactNode }) => {
  const shop = shopify?.config?.shop;
  if (!shop) { throw new Error('Shopify config is not available'); }
  const fetch = useFetch();
  const lastRequestRef = useRef<Record<string, Promise<void> | undefined>>({});
  const [isLoading, setLoading] = useState(false);
  const [isSyncing, setSyncing] = useState(false);
  const deletedRef = useRef<Record<string, unknown | undefined>>({});
  const [rules] = useState(new Proxy<TContext['rules']>({}, proxyHandler('shopify-rules')));
  const [settings] = useState(new Proxy<Record<string, Setting | undefined>>({}, proxyHandler('shopify-settings')));
  const [syncData] = useState(new Proxy<Record<string, SyncData | undefined>>({}, proxyHandler('shopify-sync')));
  const cacheRef = useRef<Record<string, unknown | undefined>>({});

  useEffect(() => { shopify.loading(isLoading); }, [isLoading]);
  useEffect(() => {
    fetchCollection('shopify-rules');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppStateContext.Provider value={{ rules, settings, syncData, shop, cacheRef, getProductVariant, getSyncData, getLastTriggered, getShopifyCollection }}>
      {children}

      {isSyncing && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000 }}>
          <InlineStack gap='200'><div style={{ marginLeft: 'auto' }}><Icon source={RefreshIcon} tone='base' /></div>Syncing...</InlineStack>
        </div>
      )}
    </AppStateContext.Provider>
  );

  function sequentialFetch<T>(id: string, requestFn: () => Promise<T>) {
    const newPromise = (lastRequestRef.current[id] || Promise.resolve()).then(async () => {
      setSyncing(true);
      try {
        return await requestFn();
      } finally {
        setSyncing(false);
      }
    });

    lastRequestRef.current[id] = newPromise as Promise<void>;;
    return newPromise as Promise<T>;
  };

  function proxyHandler<T extends keyof Collection>(collection: T): ProxyHandler<Record<string, Collection[T] | undefined>> {
    const fetchIfNeeded = (target: Record<string, Collection[T] | undefined>, id: string) => {
      const cacheKey = `${collection}_${id}`;

      if (cacheRef.current[cacheKey] === undefined) {
        cacheRef.current[cacheKey] = fetch(`/api/app/firestore/${collection}/${id}`)
          .then((response) => { if (response.ok === false) { throw response; } return response.json(); });
      }

      if (!(id in target) && !(`${collection}_${id}` in deletedRef.current)) {
        setLoading(true);
        (cacheRef.current[cacheKey] as Promise<Collection[T]>).then(response => { target[id] = response; })
          .catch((error) => { console.error(error); target[id] = undefined; })
          .finally(() => { setLoading(false); });
      }
    };

    return {
      get(target, id: string) {
        fetchIfNeeded(target, id);
        return target[id];
      },
      set(target, id: string, value: Collection[T]) {
        delete deletedRef.current[`${collection}_${id}`];
        target[id] = { ...value, id };
        sequentialFetch(`${collection}_${id}`, () => fetch(`/api/app/firestore/${collection}/${id}`, { method: 'POST', body: JSON.stringify(value), headers: { 'Content-Type': 'application/json' } }));
        return true;
      },
      deleteProperty(target, id: string) {
        if (target[id] !== undefined) {
          sequentialFetch(`${collection}_${id}`, () => fetch(`/api/app/firestore/${collection}/${id}`, { method: 'DELETE' }));
          deletedRef.current[`${collection}_${id}`] = target[id];
          delete target[id];
        }
        return true;
      },
      has(target, id: string) {
        fetchIfNeeded(target, id);
        return id in target;
      },
    };
  }

  async function fetchCollection<T extends keyof Collection>(collection: T) {
    setLoading(true);
    return await fetch(`/api/app/firestore/${collection}`)
      .then((response) => { if (response.ok === false) { throw response; } return response.json(); })
      .then((response) => { for (const rule of response) { if (rule.id !== undefined) { rules[rule.id] = rule; } } })
      .finally(() => { setLoading(false); });
  }

  function buildCacheSyncData(response: Collection['shopify-sync'][]) {
    const collection: keyof Collection = 'shopify-sync';

    // build cache for triggered_rules_ids
    const cacheForRules: { [key: string]: Collection['shopify-sync'][] } = {};
    response.forEach((item) => {
      item.triggered_rules_ids?.forEach((ruleId) => {
        if (cacheForRules[ruleId] === undefined) { cacheForRules[ruleId] = []; }
        if (cacheForRules[ruleId].find((i) => i.id === item.id) === undefined) { cacheForRules[ruleId].push(item); }
      });
    });
    Object.keys(cacheForRules).forEach((ruleId) => { cacheRef.current[`${collection}-${ruleId}`] = Promise.resolve(cacheForRules[ruleId]); });
    // end of cache for triggered_rules_ids

    // save to syncData
    response.forEach((item) => { syncData[item.id] = item; });

    return response;
  }

  async function getSyncData(forceRefresh = false) {
    const collection: keyof Collection = 'shopify-sync';

    if (cacheRef.current[collection] === undefined || forceRefresh) {
      cacheRef.current[collection] = fetch(`/api/app/firestore/${collection}?triggered_rules`)
        .then((response) => { if (response.ok === false) { throw response; } return response.json(); })
        .then(buildCacheSyncData);
    }

    return await (cacheRef.current[collection] as Promise<Collection['shopify-sync'][]>);
  }

  async function getLastTriggered(ruleId: 'new' | string) {
    if (ruleId === 'new') { return []; }

    const collection: keyof Collection = 'shopify-sync';
    const cacheKey = `${collection}-${ruleId}`;

    if (cacheRef.current[cacheKey] === undefined) {
      cacheRef.current[cacheKey] = fetch(`/api/app/firestore/${collection}?triggered_rules_ids=${ruleId}`)
        .then((response) => { if (response.ok === false) { throw response; } return response.json(); })
        .then(buildCacheSyncData);
    }

    return await (cacheRef.current[cacheKey] as Promise<({ productVariant: Awaited<ReturnType<typeof getProductVariant>> } & Collection['shopify-sync'])[]>)
      .then(async (response: Collection['shopify-sync'][]) => {
        return await Promise.all(
          response.map(async item => {
            const productVariant = await getProductVariant(item.variant_id);
            return { ...item, productVariant };
          }),
        );
      });
  }

  async function getProductVariant(variant_id: string) {
    const query = `
      query GetProductVariant($id: ID!) {
        productVariant(id: $id) {
          id
          title
          product {
            title
          }
        }
      }
    `;
    const variables = { id: variant_id };

    if (cacheRef.current[variant_id] === undefined) {
      cacheRef.current[variant_id] = fetch('shopify:admin/api/2025-01/graphql.json', {
        method: 'POST',
        body: JSON.stringify({ query: query, variables: variables }),
      }).then((response) => response.json())
        .then((response) => response.data.productVariant);
    }

    return await cacheRef.current[variant_id] as { id: string; title: string; product: { title: string } };
  }

  async function getShopifyCollection(id: string) {
    const query = `
        query ResourcePickerQuery($id: ID!) {
          collection(id: $id) {
            id
            title
            image {
              url
            }
          }
        }
      `;

    if (cacheRef.current[id] === undefined) {
      cacheRef.current[id] = fetch('shopify:admin/api/2025-01/graphql.json', {
        method: 'POST',
        body: JSON.stringify({ query: query, variables: { id } }),
      }).then((response) => response.json())
        .then((data) => data.data.collection);
    }
    return await cacheRef.current[id] as { id: string; title: string; image: { url: string } };
  }
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAppState = () => {
  const context = useContext(AppStateContext);

  if (context === undefined) {
    throw new Error('useAppState must be used within a AppStateProvider');
  }

  return context;
};