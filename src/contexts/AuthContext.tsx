import React, { createContext, useContext, useState } from 'react';
import { User, LoginRequest, RegisterRequest } from '@/types/auth';
import { authApi } from '@/api/auth.api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    const savedUser = localStorage.getItem('user_info');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u.role !== 'ADMIN') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user_info');
          return null;
        }
      } catch {
        return null;
      }
    }
    return localStorage.getItem('access_token');
  });

  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user_info');
    if (!saved) return null;
    try {
      const u = JSON.parse(saved);
      if (u.role !== 'ADMIN') return null;
      return u;
    } catch {
      return null;
    }
  });

  const isAuthenticated = !!token && user?.role === 'ADMIN';
  const isAdmin = true;

  const login = async (data: LoginRequest) => {
    const res = await authApi.login(data);
    const accessToken = res.data.access_token;

    // Decode role from JWT payload
    let role: string = 'USER';
    let decodedJson: Record<string, unknown> = {};
    try {
      const payloadBase64 = accessToken.split('.')[1];
      decodedJson = JSON.parse(atob(payloadBase64));
      const roles = (decodedJson.roles as string[]) || [];
      role = (roles[0] || 'USER').replace('ROLE_', '');
    } catch (e) {
      console.error('Error decoding token', e);
    }

    // NGHIÊM CẤM TÀI KHOẢN KHÁCH HÀNG (USER) ĐĂNG NHẬP TRANG QUẢN TRỊ
    if (role !== 'ADMIN') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_info');
      setToken(null);
      setUser(null);
      throw new Error('Tài khoản khách hàng không có quyền truy cập trang quản trị!');
    }

    localStorage.setItem('access_token', accessToken);
    setToken(accessToken);

    const currentUser: User = {
      id: Number(decodedJson.userId || decodedJson.id || 0),
      username: (decodedJson.sub as string) || data.username,
      role: 'ADMIN',
    };
    setUser(currentUser);
    localStorage.setItem('user_info', JSON.stringify(currentUser));
  };

  const register = async () => {
    throw new Error('Trang quản trị không hỗ trợ đăng ký tài khoản tự do!');
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_info');
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isAdmin,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
