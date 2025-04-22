import { useState } from 'react';
import { useFetch } from './http-client';
import { DocumentSnapshot } from '../../../functions/src/api/app/firestore/types';

export enum CollectionName {
  ShopifyRules = 'shopify-rules',
}

export default function useFirestore() {
  const fetch = useFetch();
  const [loading, setLoading] = useState(false);

  return {
    loading,
    async create<T>(collectionName: CollectionName, data: Omit<T, keyof DocumentSnapshot>) {
      setLoading(true);
      return await fetch(`/api/app/firestore/${collectionName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((response) => {
        if (!response.ok) {
          throw new Error('Failed to create document');
        }
        return response.json();
      }).finally(() => setLoading(false));
    },
    async read(collectionName: CollectionName, id: string) {
      setLoading(true);
      return await fetch(`/api/app/firestore/${collectionName}/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }).then((response) => {
        if (!response.ok) {
          throw new Error('Failed to create document');
        }
        return response.json();
      }).finally(() => setLoading(false));
    },
    async update<T>(collectionName: CollectionName, id: string, data: Partial<T>) {
      setLoading(true);
      return await fetch(`/api/app/firestore/${collectionName}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((response) => {
        if (!response.ok) {
          throw new Error('Failed to create document');
        }
        return response.json();
      }).finally(() => setLoading(false));
    },
    async delete(collectionName: CollectionName, id: string) {
      setLoading(true);
      return await fetch(`/api/app/firestore/${collectionName}/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      }).finally(() => setLoading(false));
    },
  };
}
