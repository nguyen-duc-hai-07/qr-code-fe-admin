import { apiClient } from './client';
import { ResponseGeneral } from '@/types/api';
import { Category, CategoryMenu, CategoryRequest } from '@/types/category';
import { Product, ProductAvailabilityRequest, ProductRequest } from '@/types/product';

export const menuApi = {
  // Public Menu & Categories
  getPublicMenu: async (): Promise<ResponseGeneral<CategoryMenu[]>> => {
    const res = await apiClient.get<ResponseGeneral<CategoryMenu[]>>('/api/v1/categories/menu');
    return res.data;
  },

  getActiveCategories: async (): Promise<ResponseGeneral<Category[]>> => {
    const res = await apiClient.get<ResponseGeneral<Category[]>>('/api/v1/categories');
    return res.data;
  },

  getCategoryById: async (id: number): Promise<ResponseGeneral<Category>> => {
    const res = await apiClient.get<ResponseGeneral<Category>>(`/api/v1/categories/${id}`);
    return res.data;
  },

  // Public Products
  getProducts: async (params?: {
    keyword?: string;
    category_id?: number;
  }): Promise<ResponseGeneral<Product[]>> => {
    const res = await apiClient.get<ResponseGeneral<Product[]>>('/api/v1/products', {
      params,
    });
    return res.data;
  },

  getProductById: async (id: number): Promise<ResponseGeneral<Product>> => {
    const res = await apiClient.get<ResponseGeneral<Product>>(`/api/v1/products/${id}`);
    return res.data;
  },

  // Admin Categories (Sử dụng URL chuẩn RESTful /api/v1/categories)
  getAllCategoriesAdmin: async (): Promise<ResponseGeneral<Category[]>> => {
    const res = await apiClient.get<ResponseGeneral<Category[]>>('/api/v1/categories', {
      params: { all: true },
    });
    return res.data;
  },

  createCategory: async (data: CategoryRequest): Promise<ResponseGeneral<Category>> => {
    const res = await apiClient.post<ResponseGeneral<Category>>('/api/v1/categories', data);
    return res.data;
  },

  updateCategory: async (
    id: number,
    data: CategoryRequest
  ): Promise<ResponseGeneral<Category>> => {
    const res = await apiClient.put<ResponseGeneral<Category>>(
      `/api/v1/categories/${id}`,
      data
    );
    return res.data;
  },

  deleteCategory: async (id: number): Promise<ResponseGeneral<void>> => {
    const res = await apiClient.delete<ResponseGeneral<void>>(`/api/v1/categories/${id}`);
    return res.data;
  },

  // Admin Products (Sử dụng URL chuẩn RESTful /api/v1/products)
  getAllProductsAdmin: async (params?: {
    keyword?: string;
    category_id?: number;
  }): Promise<ResponseGeneral<Product[]>> => {
    const res = await apiClient.get<ResponseGeneral<Product[]>>('/api/v1/products', {
      params: { ...params, all: true },
    });
    return res.data;
  },

  createProduct: async (data: ProductRequest): Promise<ResponseGeneral<Product>> => {
    const res = await apiClient.post<ResponseGeneral<Product>>('/api/v1/products', data);
    return res.data;
  },

  updateProduct: async (id: number, data: ProductRequest): Promise<ResponseGeneral<Product>> => {
    const res = await apiClient.put<ResponseGeneral<Product>>(`/api/v1/products/${id}`, data);
    return res.data;
  },

  updateProductAvailability: async (
    id: number,
    is_available: boolean
  ): Promise<ResponseGeneral<Product>> => {
    const res = await apiClient.patch<ResponseGeneral<Product>>(
      `/api/v1/products/${id}/availability`,
      { is_available } as ProductAvailabilityRequest
    );
    return res.data;
  },

  deleteProduct: async (id: number): Promise<ResponseGeneral<void>> => {
    const res = await apiClient.delete<ResponseGeneral<void>>(`/api/v1/products/${id}`);
    return res.data;
  },
};
