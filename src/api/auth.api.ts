import { apiClient } from './client';
import { ResponseGeneral } from '@/types/api';
import { LoginRequest, RegisterRequest, TokenResponse, User } from '@/types/auth';

export const authApi = {
  login: async (data: LoginRequest): Promise<ResponseGeneral<TokenResponse>> => {
    const res = await apiClient.post<ResponseGeneral<TokenResponse>>('/api/v1/auth/login', data);
    return res.data;
  },

  register: async (data: RegisterRequest): Promise<ResponseGeneral<TokenResponse>> => {
    const res = await apiClient.post<ResponseGeneral<TokenResponse>>('/api/v1/auth/register', data);
    return res.data;
  },

  refresh: async (refreshToken?: string): Promise<ResponseGeneral<TokenResponse>> => {
    const res = await apiClient.post<ResponseGeneral<TokenResponse>>('/api/v1/auth/refresh', {
      refresh_token: refreshToken,
    });
    return res.data;
  },

  logout: async (refreshToken?: string): Promise<ResponseGeneral<void>> => {
    const res = await apiClient.post<ResponseGeneral<void>>('/api/v1/auth/logout', {
      refresh_token: refreshToken,
    });
    return res.data;
  },
};
