import { apiClient } from './client';
import { ResponseGeneral } from '@/types/api';

export interface FileResponse {
  file_name: string;
  file_url: string;
  url?: string;
  size?: number;
  content_type?: string;
}

export const fileApi = {
  uploadFile: async (file: File): Promise<ResponseGeneral<FileResponse>> => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await apiClient.post<ResponseGeneral<FileResponse>>(
      '/api/v1/files/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    if (res.data?.data) {
      if (!res.data.data.file_url && res.data.data.url) {
        res.data.data.file_url = res.data.data.url;
      }
    }
    return res.data;
  },

  uploadMultipleFiles: async (files: File[]): Promise<ResponseGeneral<FileResponse[]>> => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));

    const res = await apiClient.post<ResponseGeneral<FileResponse[]>>(
      '/api/v1/files/upload-multiple',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return res.data;
  },

  deleteFile: async (fileName: string): Promise<ResponseGeneral<void>> => {
    const res = await apiClient.delete<ResponseGeneral<void>>('/api/v1/files', {
      params: { file_name: fileName },
    });
    return res.data;
  },
};
