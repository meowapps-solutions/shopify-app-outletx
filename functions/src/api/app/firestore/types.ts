/* eslint-disable max-len */

import {WhereFilterOp} from 'firebase-admin/firestore';

export interface DocumentSnapshot {
  id: string;
  created_at: string;
  updated_at: string;
  shop: string;
}

export type FilterValue = string | number | boolean | (string | number | boolean)[];
export type OperatorObject = Partial<Record<WhereFilterOp, FilterValue>>;
export type FieldFilter = FilterValue | OperatorObject;
export type FirestoreQueryParams = {
  limit?: string;
  offset?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  where: Record<string, FieldFilter>
};
