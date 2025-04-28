import {Rule} from './rule.types';
import {Setting} from './setting.types';

export interface Collection {
  'shopify-rules': Rule & DefaultField;
  'shopify-settings': Setting & DefaultField;
}

export interface DefaultField {
  id: string
  created_at: string
  updated_at: string
  shop: string
}
