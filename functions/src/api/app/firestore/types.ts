export interface Collection {
  'shopify-rules': Rule & DefaultField;
  'shopify-settings': Setting & DefaultField;
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
}

export interface Setting {
  enabled?: boolean;
  excluded_collections?: { id: string; variants?: string[] }[];
  excluded_products?: { id: string; variants?: string[] }[];
  default_outlet_collection_id?: string;
  last_sync_time?: string;
  sync_status?: 'success' | 'error' | 'need_sync';
}
