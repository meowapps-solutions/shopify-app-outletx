export interface Setting {
  enabled?: boolean;
  excluded_collections?: string[];
  excluded_products?: string[];
  default_outlet_collection_id?: string;
  last_sync_time?: string;
  sync_status?: 'success' | 'error' | 'need_sync';
}
