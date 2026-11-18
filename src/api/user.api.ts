import { apiClient } from './client';
import { PageResponse, ResponseGeneral } from '@/types/api';
import { User, UserRole } from '@/types/auth';

export interface UserCreatePayload {
  username: string;
  full_name?: string;
  phone_number?: string;
  password?: string;
  role: UserRole;
}

export interface UserUpdatePayload {
  username?: string;
  full_name?: string;
  phone_number?: string;
  password?: string;
  role?: UserRole;
}

export const userApi = {
  getUsers: async (params?: {
    keyword?: string;
    page?: number;
    size?: number;
    all?: boolean;
  }): Promise<ResponseGeneral<PageResponse<User>>> => {
    const res = await apiClient.get<ResponseGeneral<PageResponse<User>>>('/api/v1/users', {
      params,
    });
    return res.data;
  },

  getUserById: async (id: number): Promise<ResponseGeneral<User>> => {
    const res = await apiClient.get<ResponseGeneral<User>>(`/api/v1/users/${id}`);
    return res.data;
  },

  createUser: async (data: UserCreatePayload): Promise<ResponseGeneral<User>> => {
    const res = await apiClient.post<ResponseGeneral<User>>('/api/v1/users', data);
    return res.data;
  },

  updateUser: async (id: number, data: UserUpdatePayload): Promise<ResponseGeneral<User>> => {
    const res = await apiClient.put<ResponseGeneral<User>>(`/api/v1/users/${id}`, data);
    return res.data;
  },

  deleteUser: async (id: number): Promise<ResponseGeneral<void>> => {
    const res = await apiClient.delete<ResponseGeneral<void>>(`/api/v1/users/${id}`);
    return res.data;
  },
};
