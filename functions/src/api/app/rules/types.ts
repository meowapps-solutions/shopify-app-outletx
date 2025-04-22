/* eslint-disable max-len */

import {DocumentSnapshot} from '../firestore/types';

// Interfaces (Models)

export interface Rule extends DocumentSnapshot {
  name: string;
  status: 'active' | 'draft';
  condition_logic: 'all' | 'any';
  conditions: Condition[];
  trigger: Trigger[];
  apply_scope: 'all' | 'products' | 'collections';
  scope_targets?: { id: string, variants?: string[] }[];
}

export interface Condition {
  type:
  'inventory' |
  'inventory_fixed_amount' |
  'time_since_launch' |
  'sales_velocity' |
  'sales_velocity_per_day' |
  'sales_velocity_per_week' |
  'sales_velocity_per_year' |
  'tag' |
  'collection' |
  'product_type' |
  'vendor' |
  'price' |
  'time';
  operator:
  '<' |
  '>' |
  '=' |
  '>=' |
  '<=' |
  'contains' |
  'not_contains' |
  'starts_with' |
  'ends_with';
  value: string | number | string[];
}

export interface Trigger {
  type:
  'discount' |
  'discount_fixed_amount' |
  'move_to_collection';
  config: {
    value: string | number;
    options?: DiscountOptions;
  };
}

export interface DiscountOptions {
  min_price?: number;
}
