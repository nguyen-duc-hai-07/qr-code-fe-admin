import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Shield,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { userApi, UserCreatePayload, UserUpdatePayload } from '@/api/user.api';
import { User } from '@/types/auth';
import { formatDateTime } from '@/utils/format';
import { Card, CardContent, Button, Badge, Input, Dialog } from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/utils/error';

export const AdminUsersPage: React.FC = () => {
  const { showSuccess, showError, showWarning, showConfirmModal } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');

  // Modal create/edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserCreatePayload>({
    username: '',
    full_name: '',
    phone_number: '',
    password: '',
    role: 'USER',
  });
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const fetchUsers = () => {
    setLoading(true);
    userApi
      .getUsers({ keyword: keyword.trim() || undefined, all: true })
      .then((res) => setUsers(res.data?.content || []))
      .catch((err) => console.error('Lỗi tải người dùng:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, [keyword]);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setForm({
      username: '',
      full_name: '',
      phone_number: '',
      password: '',
      role: 'USER',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setForm({
      username: user.username,
      full_name: user.full_name || '',
      phone_number: user.phone_number || '',
      password: '',
      role: user.role,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username.trim()) {
      showWarning('Vui lòng nhập tên đăng nhập!');
      return;
    }

    try {
      setSaving(true);
      const trimmedPhone = form.phone_number?.trim() ? form.phone_number.trim() : undefined;
      const trimmedFullName = form.full_name?.trim() ? form.full_name.trim() : undefined;
      const trimmedUsername = form.username.trim();

      if (editingUser) {
        const updatePayload: UserUpdatePayload = {
          username: trimmedUsername,
          full_name: trimmedFullName,
          phone_number: trimmedPhone,
          role: form.role,
        };
        if (form.password && form.password.trim()) {
          updatePayload.password = form.password.trim();
        }
        const res = await userApi.updateUser(editingUser.id, updatePayload);
        setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? res.data : u)));
        showSuccess('Cập nhật tài khoản thành công!');
      } else {
        if (!form.password || form.password.length < 8) {
          showWarning('Mật khẩu bắt buộc có tối thiểu 8 ký tự!');
          setSaving(false);
          return;
        }
        const createPayload: UserCreatePayload = {
          username: trimmedUsername,
          full_name: trimmedFullName,
          phone_number: trimmedPhone,
          password: form.password,
          role: form.role,
        };
        const res = await userApi.createUser(createPayload);
        setUsers((prev) => [res.data, ...prev]);
        showSuccess('Tạo tài khoản mới thành công!');
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      showError(getErrorMessage(err, 'Lưu tài khoản thất bại!'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (user: User) => {
    showConfirmModal({
      title: 'Xác nhận xóa tài khoản',
      message: `Bạn có chắc chắn muốn xóa tài khoản "${user.username}"?`,
      description: 'Hành động này sẽ xóa vĩnh viễn tài khoản khỏi hệ thống.',
      type: 'danger',
      confirmText: 'Xóa tài khoản',
      cancelText: 'Hủy bỏ',
      onConfirm: async () => {
        try {
          await userApi.deleteUser(user.id);
          setUsers((prev) => prev.filter((u) => u.id !== user.id));
          showSuccess(`Đã xóa tài khoản "${user.username}" thành công!`);
        } catch (err: unknown) {
          showError(getErrorMessage(err, 'Xóa tài khoản thất bại!'));
        }
      },
    });
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <Card>
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Quản lý Tài khoản & Phân quyền
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Danh sách nhân viên, quản trị viên và tài khoản vận hành hệ thống
            </p>
          </div>

          <Button onClick={handleOpenCreate} size="sm">
            <Plus className="w-4 h-4" />
            <span>Tạo tài khoản mới</span>
          </Button>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Tìm theo username, họ tên, số điện thoại..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200/80 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Tài khoản</th>
                <th className="py-3 px-4">Họ và tên</th>
                <th className="py-3 px-4">Số điện thoại</th>
                <th className="py-3 px-4 text-center">Vai trò</th>
                <th className="py-3 px-4">Ngày tạo</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-1 text-blue-600" />
                    <span>Đang tải danh sách tài khoản...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Không tìm thấy tài khoản nào!
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isAdminRole = u.role === 'ADMIN';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{u.username}</td>
                      <td className="py-3 px-4 text-slate-700">{u.full_name || '—'}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {u.phone_number || '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={isAdminRole ? 'default' : 'secondary'}>
                          <Shield className="w-3 h-3 mr-1" />
                          <span>{u.role}</span>
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {formatDateTime(u.created_at)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(u)}
                            title="Sửa"
                          >
                            <Edit2 className="w-4 h-4 text-slate-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(u)}
                            title="Xóa"
                            className="hover:text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-4 h-4 text-slate-400" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Thêm / Sửa User */}
      <Dialog
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title={editingUser ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản mới'}
        maxWidth="sm"
      >
        <form onSubmit={handleSave} className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Tên đăng nhập (username) <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              disabled={!!editingUser}
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="VD: nv_thu_ngan"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Họ và tên</label>
            <Input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="VD: Nguyễn Văn A"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Số điện thoại
            </label>
            <Input
              value={form.phone_number}
              onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
              placeholder="VD: 0986013093"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              {editingUser ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu (tối thiểu 8 ký tự)'}
              {!editingUser && <span className="text-rose-500"> *</span>}
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                required={!editingUser}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Vai trò</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as any })}
              className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="USER">USER (Nhân viên / Khách hàng)</option>
              <option value="ADMIN">ADMIN (Quản trị viên toàn quyền)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingUser ? 'Lưu thay đổi' : 'Tạo tài khoản'}</span>
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
