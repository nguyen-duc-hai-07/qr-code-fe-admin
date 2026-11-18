import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { ToastProvider } from '@/contexts/ToastContext';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminLayout } from '@/components/AdminLayout';

import { LoginPage } from '@/pages/LoginPage';
import { AdminLiveOrdersPage } from '@/pages/admin/AdminLiveOrdersPage';
import { AdminMenuPage } from '@/pages/admin/AdminMenuPage';
import { AdminTablesPage } from '@/pages/admin/AdminTablesPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { AdminTableMapPage } from '@/pages/admin/AdminTableMapPage';
import { AdminPosPage } from '@/pages/admin/AdminPosPage';
import { AdminKitchenPage } from '@/pages/admin/AdminKitchenPage';
import { AdminAnalyticsPage } from '@/pages/admin/AdminAnalyticsPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WebSocketProvider>
          <ToastProvider>
            <Routes>
              {/* Trang Đăng nhập Dành riêng cho Quản trị viên & Nhân viên */}
              <Route path="/login" element={<LoginPage />} />

              {/* Toàn bộ hệ thống quản trị được bảo vệ bởi quyền ROLE_ADMIN */}
              <Route element={<ProtectedRoute requiredRole="ADMIN" />}>
                <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="dashboard" element={<AdminTableMapPage />} />
                  <Route path="pos" element={<AdminPosPage />} />
                  <Route path="orders" element={<AdminLiveOrdersPage />} />
                  <Route path="kitchen" element={<AdminKitchenPage />} />
                  <Route path="analytics" element={<AdminAnalyticsPage />} />
                  <Route path="menu" element={<AdminMenuPage />} />
                  <Route path="tables" element={<AdminTablesPage />} />
                  <Route path="users" element={<AdminUsersPage />} />
                </Route>
              </Route>

              {/* Fallback điều hướng về trang chủ quản trị */}
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Routes>
          </ToastProvider>
        </WebSocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
