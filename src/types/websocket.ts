import { Order } from './order';
import { Product } from './product';

export interface NewOrderEvent {
  action: 'NEW_ORDER';
  order: Order;
  message?: string;
  timestamp?: number;
}

export interface OrderStatusUpdatedEvent {
  action: 'ORDER_STATUS_UPDATED';
  order: Order;
  message?: string;
  timestamp?: number;
}

export interface OrderItemRemovedEvent {
  action: 'ORDER_ITEM_REMOVED';
  order: Order;
  message?: string;
  timestamp?: number;
}

export interface ProductAvailabilityEvent {
  action: 'PRODUCT_AVAILABILITY_CHANGED';
  productId: number;
  productName: string;
  isAvailable: boolean;
  statusText?: string;
  message?: string;
  product?: Product;
  timestamp?: number;
}

export interface OnlineCountEvent {
  action: 'ONLINE_COUNT';
  count: number;
  timestamp?: number;
}

export type WebSocketPayload =
  | NewOrderEvent
  | OrderStatusUpdatedEvent
  | OrderItemRemovedEvent
  | ProductAvailabilityEvent
  | OnlineCountEvent
  | { action: string; [key: string]: unknown };
