/* eslint-disable max-len */

import {Rule} from '../firestore/types';


// Interfaces (Models)

export interface SyncData {
  id: string,
  shop: string,
  variant_id: string,
  price?: number,
  created_at?: string,
  product_id?: string,
  tags?: string[],
  collections?: string[],
  product_type?: string,
  vendor?: string,
  inventory_item_id?: string,
  inventory_levels?: {
    id: string,
    quantities: {
      id: string,
      name: string,
      quantity: number,
    }[],
  }[],
  orders?: {
    id: string,
    lineItemId: string,
    processedAt: string,
    quantity: number,
  }[],
  inventory?: {
    available: number,
    total: number,
  },
  sale_velocity?: {
    daily: number,
    weekly: number,
    monthly: number,
    yearly: number,
    calculation_end_date: string,
  },
  triggered_rules?: TriggeredRule[],
}

export interface Order {
  id: string,
  shop: string,
  lineItems: {
    edges: {
      node: {
        id: string,
        quantity: number,
        variant?: {
          id: string,
        }
      }
    }[]
  }
  processedAt: string
}

export interface ProductVariant {
  id: string,
  shop: string,
  price: string,
  createdAt: string,
  triggeredRules?: { value: string }
  product: {
    id: string,
    tags: string[],
    collections: {
      edges: { node: { id: string, title: string } }[],
    },
    productType: string,
    vendor: string,
  }
  inventoryItem: {
    id: string,
    inventoryLevels: {
      edges: {
        node: {
          id: string,
          quantities: { id: string, name: string, quantity: number }[]
        }
      }[],
    }
  }
}

// Types

export type TPageInfo = {
  pageInfo: { hasNextPage: boolean, endCursor: string }, edges: unknown[]
}

export type TriggeredRule = {
  id: string,
  created_at: string,
  reports: TriggeredRuleReport[]
}

export type TriggeredRuleReport = {
  type: Rule['trigger'][0]['type'],
  backup_value?: unknown,
  new_value?: unknown,
  error_message?: string,
}
