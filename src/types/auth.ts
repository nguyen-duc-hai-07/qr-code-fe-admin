export type UserRole = 'ADMIN' | 'USER';

export interface User {
  id: number;
  username: string;
  full_name?: string;
  phone_number?: string;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  full_name?: string;
  phone_number?: string;
  password: string;
}
