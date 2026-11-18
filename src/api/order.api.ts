import { apiClient } from './client';
import { ResponseGeneral } from '@/types/api';
import {
  Order,
  OrderCreateRequest,
  OrderCreateItem,
  OrderStatusUpdateRequest,
  OrderStatus,
  OrderType,
} from '@/types/order';

export const orderApi = {
  // Public / Customer / Guest
  createOrder: async (data: OrderCreateRequest): Promise<ResponseGeneral<Order>> => {
    const res = await apiClient.post<ResponseGeneral<Order>>('/api/v1/orders', data);
    return res.data;
  },

  trackOrder: async (orderCode: string): Promise<ResponseGeneral<Order>> => {
    const res = await apiClient.get<ResponseGeneral<Order>>(`/api/v1/orders/track/${orderCode}`);
    return res.data;
  },

  getMyOrders: async (): Promise<ResponseGeneral<Order[]>> => {
    const res = await apiClient.get<ResponseGeneral<Order[]>>('/api/v1/orders/my-orders');
    return res.data;
  },

  // Orders Management (Chuẩn RESTful /api/v1/orders)
  getAllOrdersAdmin: async (params?: {
    status?: OrderStatus;
    order_type?: OrderType;
    table_id?: number;
  }): Promise<ResponseGeneral<Order[]>> => {
    const res = await apiClient.get<ResponseGeneral<Order[]>>('/api/v1/orders', {
      params,
    });
    return res.data;
  },

  getOrderDetailAdmin: async (id: number): Promise<ResponseGeneral<Order>> => {
    const res = await apiClient.get<ResponseGeneral<Order>>(`/api/v1/orders/${id}`);
    return res.data;
  },

  updateOrderStatusAdmin: async (
    id: number,
    data: OrderStatusUpdateRequest
  ): Promise<ResponseGeneral<Order>> => {
    const res = await apiClient.put<ResponseGeneral<Order>>(
      `/api/v1/orders/${id}/status`,
      data
    );
    return res.data;
  },

  removeOrderItemAdmin: async (
    orderId: number,
    itemId: number
  ): Promise<ResponseGeneral<Order>> => {
    const res = await apiClient.delete<ResponseGeneral<Order>>(
      `/api/v1/orders/${orderId}/items/${itemId}`
    );
    return res.data;
  },

  exchangeOrderItemAdmin: async (
    orderId: number,
    itemId: number,
    data: OrderCreateItem
  ): Promise<ResponseGeneral<Order>> => {
    const res = await apiClient.put<ResponseGeneral<Order>>(
      `/api/v1/orders/${orderId}/items/${itemId}`,
      data
    );
    return res.data;
  },

  addOrderItemAdmin: async (
    orderId: number,
    data: OrderCreateItem
  ): Promise<ResponseGeneral<Order>> => {
    const res = await apiClient.post<ResponseGeneral<Order>>(
      `/api/v1/orders/${orderId}/items`,
      data
    );
    return res.data;
  },

  deleteOrderAdmin: async (id: number): Promise<ResponseGeneral<void>> => {
    const res = await apiClient.delete<ResponseGeneral<void>>(`/api/v1/orders/${id}`);
    return res.data;
  },
};
