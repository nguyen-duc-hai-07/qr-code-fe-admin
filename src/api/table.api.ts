import { apiClient } from './client';
import { ResponseGeneral } from '@/types/api';
import { StoreTable, StoreTableRequest, TableLanding } from '@/types/table';

export const tableApi = {
  // Public QR scan landing
  getTableLanding: async (qrToken: string): Promise<ResponseGeneral<TableLanding>> => {
    const res = await apiClient.get<ResponseGeneral<TableLanding>>(
      `/api/v1/tables/qr/${qrToken}/landing`
    );
    return res.data;
  },

  getTableByQrToken: async (qrToken: string): Promise<ResponseGeneral<StoreTable>> => {
    const res = await apiClient.get<ResponseGeneral<StoreTable>>(`/api/v1/tables/qr/${qrToken}`);
    return res.data;
  },

  getTableQrImageUrl: (tableId: number, size = 300): string => {
    return `/api/v1/tables/${tableId}/qr-code?size=${size}`;
  },

  // Tables Management (Chuẩn RESTful /api/v1/tables)
  getAllTablesAdmin: async (): Promise<ResponseGeneral<StoreTable[]>> => {
    const res = await apiClient.get<ResponseGeneral<StoreTable[]>>('/api/v1/tables');
    return res.data;
  },

  getTableByIdAdmin: async (id: number): Promise<ResponseGeneral<StoreTable>> => {
    const res = await apiClient.get<ResponseGeneral<StoreTable>>(`/api/v1/tables/${id}`);
    return res.data;
  },

  createTable: async (data: StoreTableRequest): Promise<ResponseGeneral<StoreTable>> => {
    const res = await apiClient.post<ResponseGeneral<StoreTable>>('/api/v1/tables', data);
    return res.data;
  },

  updateTable: async (
    id: number,
    data: StoreTableRequest
  ): Promise<ResponseGeneral<StoreTable>> => {
    const res = await apiClient.put<ResponseGeneral<StoreTable>>(
      `/api/v1/tables/${id}`,
      data
    );
    return res.data;
  },

  deleteTable: async (id: number): Promise<ResponseGeneral<void>> => {
    const res = await apiClient.delete<ResponseGeneral<void>>(`/api/v1/tables/${id}`);
    return res.data;
  },
};
