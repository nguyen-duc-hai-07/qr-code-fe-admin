import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ResponseGeneral } from '@/types/api';
import { TokenResponse } from '@/types/auth';

const BASE_URL = import.meta.env.VITE_API_URL || '';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept-Language': 'vi',
    'Language': 'vi',
  },
  withCredentials: true, // Gửi cookie refresh_token HttpOnly
});

// Gắn Bearer access_token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Tự động refresh token khi gặp 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/api/v1/auth/login') &&
      !originalRequest.url?.includes('/api/v1/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post<ResponseGeneral<TokenResponse>>(
          `${BASE_URL}/api/v1/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = response.data?.data?.access_token;
        if (newAccessToken) {
          localStorage.setItem('access_token', newAccessToken);
          apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
          processQueue(null, newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_info');
        if (window.location.pathname.startsWith('/admin')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Chuẩn hóa thông báo lỗi 100% Tiếng Việt cho Axios Error
    const status = error.response?.status;
    let viMessage = '';
    if (status === 401) {
      viMessage = 'Tên đăng nhập hoặc mật khẩu không chính xác!';
    } else if (status === 403) {
      viMessage = 'Bạn không có quyền thực hiện thao tác này!';
    } else if (status === 404) {
      viMessage = 'Đường dẫn hoặc dữ liệu không tồn tại!';
    } else if (status === 409) {
      viMessage = 'Dữ liệu này đã tồn tại trong hệ thống!';
    } else if (status && status >= 500) {
      viMessage = 'Hệ thống máy chủ đang gặp sự cố, vui lòng thử lại sau ít phút!';
    }

    const data = error.response?.data as Record<string, unknown> | undefined;
    if (viMessage) {
      if (!data?.message || typeof data.message !== 'string' || data.message.includes('status code')) {
        if (data && typeof data === 'object') {
          data.message = viMessage;
        }
      }
      error.message = (typeof data?.message === 'string' && data.message) ? data.message : viMessage;
    } else if (data?.message && typeof data.message === 'string') {
      error.message = data.message;
    }

    return Promise.reject(error);
  }
);
