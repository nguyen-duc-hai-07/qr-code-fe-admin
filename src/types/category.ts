import { Product } from './product';

export interface Category {
  id: number;
  name: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
}

export interface CategoryRequest {
  name: string;
  display_order?: number;
  is_active?: boolean;
}

export interface CategoryMenu {
  id: number;
  name: string;
  display_order: number;
  products: Product[];
}
