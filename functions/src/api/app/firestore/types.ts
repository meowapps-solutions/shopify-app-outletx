export interface Collection {
  'shopify-rules': Rule & DefaultField;
  'shopify-settings': Setting & DefaultField;
  'shopify-sync': SyncData & DefaultField;
}

export interface DefaultField {
  id: string
  updated_at: string
  shop: string
}

export interface Rule {
  name: string;
  status: 'active' | 'inactive';
  apply_scope: 'all' | 'products' | 'collections';
  scope_targets?: { id: string; variants?: string[] }[];
  conditions: {
    type: 'inventory' | 'inventory_fixed_amount' | 'time_since_launch' | 'sales_velocity' | 'sales_velocity_per_day' | 'sales_velocity_per_week' | 'sales_velocity_per_year' | 'tag' | 'collection' | 'product_type' | 'vendor' | 'price' | 'time';
    operator: '<' | '>' | '=' | '>=' | '<=' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with';
    value: string | number | string[];
  }[];
  condition_logic: 'all' | 'any';
  trigger: {
    type: 'discount' | 'discount_fixed_amount' | 'move_to_collection' | 'add_tag';
    config: {
      value: string | number;
      options?: {
        min_price?: number; // for discount
      };
    };
  }[];
  last_triggered_at?: string;
}

export interface Setting {
  enabled?: boolean;
  excluded_collections?: { id: string; variants?: string[] }[];
  excluded_products?: { id: string; variants?: string[] }[];
  default_outlet_collection_id?: string;
  last_sync_time?: string;
  sync_status?: 'success' | 'error' | 'need_sync';
  notifications?: {
    email?: string;
    subscribed_events?: ('rule-triggered' | 'weekly-summary')[];
  };
}

export interface SyncData {
  variant_id: string,
  price?: number,
  product_id?: string,
  product_created_at?: string,
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
  triggered_rules?: {
    id: string,
    created_at: string,
    reports: {
      type: Rule['trigger'][0]['type'],
      backup_value?: unknown,
      new_value?: unknown,
      error_message?: string,
    }[]
  }[],
  triggered_rules_ids?: string[],
}
