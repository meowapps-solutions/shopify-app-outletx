import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Icon, InlineStack } from '@shopify/polaris';
import { RefreshIcon } from '@shopify/polaris-icons';
import { Collection, Rule, Setting } from '../../../functions/src/api/app/firestore/types';
import { useFetch } from '../hooks/http-client';

type TContext = {
  rules: Record<string, Rule | undefined>;
  settings: Record<string, Setting | undefined>;
  shop: string;
}

const AppStateContext = createContext<TContext | undefined>(undefined);

export const AppStateProvider = ({ children }: { children: React.ReactNode }) => {
  const shop = shopify.config.shop;
  if (!shop) { throw new Error('Shopify config is not available'); }
  const fetch = useFetch();
  const lastRequestRef = useRef<Record<string, Promise<void> | undefined>>({});
  const [isLoading, setLoading] = useState(false);
  const [isSyncing, setSyncing] = useState(false);
  const deletedRef = useRef<Record<string, unknown | undefined>>({});
  const [rules] = useState(new Proxy<TContext['rules']>({}, proxyHandler('shopify-rules')));
  const [settings] = useState(new Proxy<Record<string, Setting | undefined>>({}, proxyHandler('shopify-settings')));

  useEffect(() => { shopify.loading(isLoading); }, [isLoading]);
  useEffect(() => {
    fetchCollection('shopify-rules');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppStateContext.Provider value={{ rules, settings, shop }}>
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
      if (!(id in target) && !(`${collection}_${id}` in deletedRef.current)) {
        setLoading(true);
        fetch(`/api/app/firestore/${collection}/${id}`)
          .then((response) => { if (response.ok === false) { throw response; } return response.json(); })
          .then(response => { target[id] = response; })
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
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAppState = () => {
  const context = useContext(AppStateContext);

  if (context === undefined) {
    throw new Error('useAppState must be used within a AppStateProvider');
  }

  return context;
};