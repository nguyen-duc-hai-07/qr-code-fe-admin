export type OrderStatus = 'PENDING' | 'PREPARING' | 'COMPLETED' | 'CANCELLED';
export type OrderType = 'AT_TABLE' | 'DELIVERY';

export interface OrderItemOption {
  name: string;
  price: number;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id?: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  options?: string | OrderItemOption[];
  note?: string;
  is_deleted?: boolean;
}

export interface Order {
  id: number;
  order_code: string;
  order_type: OrderType;
  user_id?: number;
  table_id?: number;
  table_name?: string;
  zone?: string;
  customer_name?: string;
  customer_phone?: string;
  delivery_address?: string;
  subtotal_amount: number;
  shipping_fee?: number;
  total_amount: number;
  note?: string;
  status: OrderStatus;
  created_at: string;
  items: OrderItem[];
}

export interface OrderCreateItem {
  product_id: number;
  quantity: number;
  note?: string;
  options?: OrderItemOption[];
}

export interface OrderCreateRequest {
  order_type: OrderType;
  table_id?: number;
  qr_token?: string;
  customer_name?: string;
  customer_phone?: string;
  delivery_address?: string;
  note?: string;
  items: OrderCreateItem[];
}

export interface OrderStatusUpdateRequest {
  status: OrderStatus;
  note?: string;
}
