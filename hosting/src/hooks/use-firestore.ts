import { useEffect, useRef, useState } from 'react';
import { useFetch } from './http-client';
import { DocumentSnapshot, FirestoreQueryParams } from '../../../functions/src/api/app/firestore/types';

export enum CollectionName {
  ShopifyRules = 'shopify-rules',
}

export default function useFirestore() {
  const fetch = useFetch();
  const [isLoading, setLoading] = useState(false);
  const [isSyncing, setSyncing] = useState(false);
  const [localStorage, setLocalStorage] = useState<{ [key: string]: object }>({});
  const lastRequestRef = useRef(Promise.resolve());

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = 'An operation is in progress. Are you sure you want to leave?';
      return 'An operation is in progress. Are you sure you want to leave?';
    };

    if (isSyncing) {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isSyncing]);

  return {
    isLoading,
    isSyncing: isLoading === false && isSyncing,
    async create<T>(collectionName: CollectionName, data: Omit<T, keyof DocumentSnapshot>) {
      const request = sequentialFetch(async () => {
        return await fetch(`/api/app/firestore/${collectionName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }).then(async (response) => {
          if (!response.ok) {
            throw new Error('Failed to create document');
          }
          const json: DocumentSnapshot = await response.json();
          const cacheKey = getCacheKey(collectionName, json.id);
          setLocalStorage((prev) => ({ ...prev, [cacheKey]: json }));
          return json;
        });
      });

      setLoading(true);
      return await request.finally(() => setLoading(false)) as T;
    },
    async read<T>(collectionName: CollectionName, id: string) {
      const cacheKey = getCacheKey(collectionName, id);
      const cachedData = localStorage[cacheKey];
      if (cachedData) { return cachedData as T; }

      setLoading(true);
      return await fetch(`/api/app/firestore/${collectionName}/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to create document');
        }
        const json: DocumentSnapshot = await response.json();
        setLocalStorage((prev) => ({ ...prev, [cacheKey]: json }));
        return json;
      }).finally(() => setLoading(false)) as T;
    },
    async query<T>(collectionName: CollectionName, queryParams?: FirestoreQueryParams): Promise<T[]> {
      // Construct the API endpoint URL
      let url = `/api/app/firestore/${collectionName}`;

      // Append query parameters if provided
      if (queryParams) {
        // Filter out undefined/null values and convert all values to string for URLSearchParams
        const definedParams = Object.entries(queryParams)
          .filter(([, value]) => value !== undefined && value !== null)
          .reduce((acc, [key, value]) => {
            acc[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
            return acc;
          }, {} as Record<string, string>);

        const queryString = new URLSearchParams(definedParams).toString();
        if (queryString) {
          url += `?${queryString}`;
        }
      }

      setLoading(true);
      return await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to create document');
        }
        const jsonArray: DocumentSnapshot[] = await response.json();
        setLocalStorage((prev) => {
          const updates: { [key: string]: object } = {};
          jsonArray.forEach((doc) => {
            if (doc.id) {
              const cacheKey = getCacheKey(collectionName, doc.id);
              updates[cacheKey] = doc;
            } else {
              console.warn('Document missing \'id\' in query result, cannot cache:', doc);
            }
          });
          return { ...prev, ...updates };
        });
        return jsonArray;
      }).finally(() => setLoading(false)) as T[];
    },
    async update<T>(collectionName: CollectionName, id: string, data: Partial<T>) {
      const request = sequentialFetch(async () => {
        return await fetch(`/api/app/firestore/${collectionName}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }).then(async (response) => {
          if (!response.ok) {
            throw new Error('Failed to create document');
          }
          const json: DocumentSnapshot = await response.json();
          const cacheKey = getCacheKey(collectionName, id);
          setLocalStorage((prev) => ({ ...prev, [cacheKey]: { ...prev[cacheKey], ...json } }));
          return json;
        });
      });

      const cacheKey = getCacheKey(collectionName, id);
      const cachedData = localStorage[cacheKey];
      if (cachedData) { return { ...cachedData, ...data } as T; }

      setLoading(true);
      return await request.finally(() => setLoading(false)) as T;
    },
    async delete(collectionName: CollectionName, id: string) {
      const request = sequentialFetch(async () => {
        return await fetch(`/api/app/firestore/${collectionName}/${id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        });
      });

      setLoading(true);
      return await request.finally(() => setLoading(false));
    },
  };

  function sequentialFetch<T>(requestFn: () => Promise<T>) {
    const newPromise = lastRequestRef.current.then(async () => {
      setSyncing(true);
      try {
        return await requestFn();
      } finally {
        setSyncing(false);
      }
    });

    lastRequestRef.current = newPromise as Promise<void>;;
    return newPromise as Promise<T>;
  };


  function getCacheKey(collectionName: CollectionName, id: string) {
    return `${collectionName}-${id}`;
  };
}
