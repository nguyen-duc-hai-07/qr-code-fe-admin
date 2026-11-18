import { Category } from './category';
import { Product } from './product';

export interface StoreTable {
  id: number;
  zone: string;
  location_name: string;
  qr_token: string;
  is_active: boolean;
  created_at?: string;
}

export interface StoreTableRequest {
  zone: string;
  location_name: string;
  is_active?: boolean;
}

export interface TableLanding {
  table: StoreTable;
  categories: Category[];
  products: Product[];
}
