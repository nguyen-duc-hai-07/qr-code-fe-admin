export interface ProductTopping {
  name: string;
  price: number;
}

export interface Product {
  id: number;
  category_id?: number;
  category_name?: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_available: boolean;
  toppings?: ProductTopping[];
  created_at?: string;
}

export interface ProductRequest {
  category_id?: number;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_available?: boolean;
  toppings?: ProductTopping[];
}

export interface ProductAvailabilityRequest {
  is_available: boolean;
}
