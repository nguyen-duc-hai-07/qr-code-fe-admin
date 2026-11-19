import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  UtensilsCrossed,
  FolderTree,
  Plus,
  Search,
  Edit2,
  Trash2,
  Upload,
  X,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Filter,
  AlertTriangle,
  Link2,
  Image as ImageIcon,
} from 'lucide-react';
import { menuApi } from '@/api/menu.api';
import { fileApi } from '@/api/file.api';
import { Category, CategoryRequest } from '@/types/category';
import { Product, ProductRequest } from '@/types/product';
import { formatCurrency } from '@/utils/format';
import { Card, CardContent, Button, Badge, Input, Dialog } from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/utils/error';

export const AdminMenuPage: React.FC = () => {
  const { showSuccess, showError, showWarning, showConfirmModal } = useToast();
  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'CATEGORIES'>('PRODUCTS');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);

  // Product Modal state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodForm, setProdForm] = useState<ProductRequest>({
    name: '',
    price: 0,
    category_id: undefined,
    description: '',
    image_url: '',
    is_available: true,
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreviewError, setImagePreviewError] = useState(false);
  const [imageInputMode, setImageInputMode] = useState<'FILE' | 'URL'>('FILE');

  // Category Modal state
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState<CategoryRequest>({
    name: '',
    display_order: 0,
    is_active: true,
  });

  const [saving, setSaving] = useState(false);

  const fetchData = () => {
    setLoading(true);
    Promise.all([menuApi.getAllCategoriesAdmin(), menuApi.getAllProductsAdmin()])
      .then(([catsRes, prodsRes]) => {
        setCategories(catsRes.data || []);
        setProducts(prodsRes.data || []);
      })
      .catch((err) => console.error('Lỗi tải menu:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Bật / tắt Còn hàng / Hết hàng ngay tại thẻ món
  const handleToggleAvailability = async (product: Product) => {
    const nextStatus = !product.is_available;
    try {
      const res = await menuApi.updateProductAvailability(product.id, nextStatus);
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_available: res.data.is_available } : p))
      );
      showSuccess(`Đã cập nhật trạng thái: ${nextStatus ? 'Còn hàng' : 'Hết hàng'}`);
    } catch (err: unknown) {
      showError(getErrorMessage(err, 'Không thể đổi trạng thái món ăn!'));
    }
  };

  // Upload image
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImagePreviewError(false);

    // Kiểm tra tính hợp lệ của file ảnh
    if (!file.type.startsWith('image/')) {
      showError('File bạn chọn không phải là hình ảnh. Vui lòng chọn file ảnh .jpg, .png hoặc .webp!');
      if (e.target) e.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showError('Dung lượng ảnh vượt quá 10MB, vui lòng chọn file ảnh nhỏ hơn!');
      if (e.target) e.target.value = '';
      return;
    }

    // Đọc file thành Base64 Data URL ngay lập tức - ĐẢM BẢO KHÔNG BAO GIỜ BỊ MẤT KHI RELOAD
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Url = reader.result as string;
      setProdForm((prev) => ({ ...prev, image_url: base64Url }));

      // Đồng thời upload lên Backend nếu có thể
      try {
        setUploadingImage(true);
        const res = await fileApi.uploadFile(file);
        const uploadedUrl = res.data?.file_url || (res.data as any)?.url;
        if (uploadedUrl && !uploadedUrl.includes('rustfs.tuvidausotoanthu')) {
          setProdForm((prev) => ({ ...prev, image_url: uploadedUrl }));
        }
      } catch (err: unknown) {
        console.warn('Backend file storage unavailable, using Base64 permanent fallback:', err);
      } finally {
        setUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);

    if (e.target) {
      e.target.value = '';
    }
  };

  // Product CRUD
  const handleOpenCreateProduct = () => {
    setEditingProduct(null);
    setImagePreviewError(false);
    setImageInputMode('FILE');
    setProdForm({
      name: '',
      price: 0,
      category_id: categories.length > 0 ? categories[0].id : undefined,
      description: '',
      image_url: '',
      is_available: true,
      toppings: [],
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (product: Product) => {
    setEditingProduct(product);
    setImagePreviewError(false);
    setImageInputMode(product.image_url?.startsWith('http') && !product.image_url?.includes('/api/v1/files/view/') ? 'URL' : 'FILE');
    setProdForm({
      name: product.name,
      price: product.price,
      category_id: product.category_id,
      description: product.description || '',
      image_url: product.image_url || '',
      is_available: product.is_available,
      toppings: product.toppings || [],
    });
    setIsProductModalOpen(true);
  };

  // Topping CRUD
  const handleAddEmptyTopping = () => {
    const currentToppings = prodForm.toppings || [];
    setProdForm({
      ...prodForm,
      toppings: [...currentToppings, { name: '', price: 5000 }],
    });
  };

  const handleToppingChange = (index: number, field: 'name' | 'price', value: string | number) => {
    const currentToppings = [...(prodForm.toppings || [])];
    currentToppings[index] = {
      ...currentToppings[index],
      [field]: value,
    };
    setProdForm({ ...prodForm, toppings: currentToppings });
  };

  const handleRemoveTopping = (index: number) => {
    const currentToppings = [...(prodForm.toppings || [])];
    currentToppings.splice(index, 1);
    setProdForm({ ...prodForm, toppings: currentToppings });
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodForm.name.trim()) {
      showWarning('Vui lòng nhập tên món ăn!');
      return;
    }
    if (prodForm.price < 0) {
      showWarning('Giá bán không hợp lệ!');
      return;
    }
    if (uploadingImage) {
      showWarning('Ảnh đang được xử lý tải lên máy chủ, vui lòng đợi trong giây lát!');
      return;
    }
    if (prodForm.image_url?.startsWith('blob:')) {
      showWarning('Ảnh đang được xử lý nạp dữ liệu, vui lòng bấm lưu lại sau 1 giây!');
      return;
    }

    try {
      setSaving(true);
      const validToppings = (prodForm.toppings || []).filter((t) => t.name.trim().length > 0);
      const payload: ProductRequest = {
        ...prodForm,
        toppings: validToppings,
      };

      if (editingProduct) {
        const res = await menuApi.updateProduct(editingProduct.id, payload);
        setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? res.data : p)));
        showSuccess('Cập nhật món ăn thành công!');
      } else {
        const res = await menuApi.createProduct(payload);
        setProducts((prev) => [...prev, res.data]);
        showSuccess('Thêm món ăn mới thành công!');
      }
      setIsProductModalOpen(false);
    } catch (err: unknown) {
      showError(getErrorMessage(err, 'Lưu món ăn thất bại!'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = (id: number) => {
    const targetProduct = products.find((p) => p.id === id);
    showConfirmModal({
      title: 'Xác nhận xóa món',
      message: `Bạn có chắc chắn muốn xóa món "${targetProduct?.name || 'này'}"?`,
      description: 'Món ăn sẽ bị ẩn khỏi thực đơn hiển thị cho khách.',
      type: 'danger',
      confirmText: 'Xóa món',
      cancelText: 'Hủy bỏ',
      onConfirm: async () => {
        try {
          await menuApi.deleteProduct(id);
          setProducts((prev) => prev.filter((p) => p.id !== id));
          showSuccess('Đã xóa món ăn thành công!');
        } catch (err: unknown) {
          showError(getErrorMessage(err, 'Xóa món ăn thất bại!'));
        }
      },
    });
  };

  // Category CRUD
  const handleOpenCreateCategory = () => {
    setEditingCategory(null);
    setCatForm({ name: '', display_order: categories.length + 1, is_active: true });
    setIsCatModalOpen(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCatForm({
      name: cat.name,
      display_order: cat.display_order,
      is_active: cat.is_active,
    });
    setIsCatModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name.trim()) {
      showWarning('Vui lòng nhập tên danh mục!');
      return;
    }

    try {
      setSaving(true);
      if (editingCategory) {
        const res = await menuApi.updateCategory(editingCategory.id, catForm);
        setCategories((prev) => prev.map((c) => (c.id === editingCategory.id ? res.data : c)));
        showSuccess('Cập nhật danh mục thành công!');
      } else {
        const res = await menuApi.createCategory(catForm);
        setCategories((prev) => [...prev, res.data]);
        showSuccess('Tạo danh mục mới thành công!');
      }
      setIsCatModalOpen(false);
    } catch (err: unknown) {
      showError(getErrorMessage(err, 'Lưu danh mục thất bại!'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = (id: number) => {
    const targetCat = categories.find((c) => c.id === id);
    showConfirmModal({
      title: 'Xác nhận xóa danh mục',
      message: `Bạn có chắc chắn muốn xóa danh mục "${targetCat?.name || ''}"?`,
      description: 'Tất cả món ăn thuộc danh mục này cũng sẽ bị ẩn khỏi thực đơn.',
      type: 'danger',
      confirmText: 'Xóa danh mục',
      cancelText: 'Hủy bỏ',
      onConfirm: async () => {
        try {
          await menuApi.deleteCategory(id);
          setCategories((prev) => prev.filter((c) => c.id !== id));
          setProducts((prev) => prev.filter((p) => p.category_id !== id));
          showSuccess('Đã xóa danh mục thành công!');
        } catch (err: unknown) {
          showError(getErrorMessage(err, 'Xóa danh mục thất bại!'));
        }
      },
    });
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCatId ? p.category_id === selectedCatId : true;
      const matchKw = searchKeyword.trim()
        ? p.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchKeyword.toLowerCase())
        : true;
      return matchCat && matchKw;
    });
  }, [products, selectedCatId, searchKeyword]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* 1. Header Card */}
      <Card>
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Quản lý Thực đơn & Món ăn
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Điều chỉnh giá, thêm món mới và gạt tắt/bật Còn hàng - Hết hàng tức thì
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'PRODUCTS' ? (
              <Button onClick={handleOpenCreateProduct} size="sm">
                <Plus className="w-4 h-4" />
                <span>Thêm món mới</span>
              </Button>
            ) : (
              <Button onClick={handleOpenCreateCategory} size="sm">
                <Plus className="w-4 h-4" />
                <span>Thêm danh mục</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. Tabs Switcher */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        <button
          onClick={() => setActiveTab('PRODUCTS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'PRODUCTS'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" />
          <span>Danh sách món ăn ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('CATEGORIES')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'CATEGORIES'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80'
          }`}
        >
          <FolderTree className="w-4 h-4" />
          <span>Danh mục món ({categories.length})</span>
        </button>
      </div>

      {/* TAB 1: PRODUCTS LIST */}
      {activeTab === 'PRODUCTS' && (
        <div className="space-y-3.5">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Tìm theo tên hoặc mô tả món..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedCatId || ''}
                onChange={(e) =>
                  setSelectedCatId(e.target.value ? Number(e.target.value) : null)
                }
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tất cả danh mục</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200/80 uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Món ăn</th>
                    <th className="py-3 px-4">Danh mục</th>
                    <th className="py-3 px-4">Đơn giá</th>
                    <th className="py-3 px-4 text-center">Trạng thái (Bật/Tắt)</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200/80 relative flex items-center justify-center">
                            {p.image_url ? (
                              <img
                                src={p.image_url}
                                alt={p.name}
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400">QR</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-xs truncate">{p.name}</p>
                            {p.toppings && p.toppings.length > 0 && (
                              <span className="inline-block px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-200/60 mt-0.5">
                                {p.toppings.length} topping
                              </span>
                            )}
                            {p.description && (
                              <p className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                                {p.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-semibold">
                        {p.category_name || 'Chưa phân loại'}
                      </td>
                      <td className="py-3 px-4 font-bold text-blue-600">
                        {formatCurrency(p.price)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleAvailability(p)}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                            p.is_available
                              ? 'bg-blue-50 text-blue-700 border border-blue-200/80 hover:bg-blue-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-200/80 hover:bg-rose-100'
                          }`}
                        >
                          {p.is_available ? (
                            <>
                              <ToggleRight className="w-4 h-4 text-blue-600" />
                              <span>Còn hàng</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4 text-rose-500" />
                              <span>Hết món</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEditProduct(p)}
                            title="Sửa món"
                          >
                            <Edit2 className="w-4 h-4 text-slate-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteProduct(p.id)}
                            title="Xóa món"
                            className="hover:text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-4 h-4 text-slate-400" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredProducts.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-xs font-medium">
                Không tìm thấy món ăn nào phù hợp với bộ lọc.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CATEGORIES LIST */}
      {activeTab === 'CATEGORIES' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Tên danh mục</th>
                  <th className="py-3 px-4 text-center">Thứ tự hiển thị</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">{c.name}</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-500">
                      {c.display_order}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant={c.is_active ? 'success' : 'secondary'}>
                        {c.is_active ? 'Đang hoạt động' : 'Đang ẩn'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditCategory(c)}
                        >
                          <Edit2 className="w-4 h-4 text-slate-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCategory(c.id)}
                          className="hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4 text-slate-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Thêm / Sửa Product */}
      <Dialog
        open={isProductModalOpen}
        onOpenChange={setIsProductModalOpen}
        title={editingProduct ? 'Chỉnh sửa món ăn' : 'Thêm món ăn mới'}
        description="Điền thông tin món ăn, giá bán và tùy chọn topping kèm theo"
      >
        <form onSubmit={handleSaveProduct} className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Tên món ăn <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              value={prodForm.name}
              onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
              placeholder="VD: Cà phê cốt dừa"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Giá bán (VND) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                required
                min={0}
                step={1000}
                value={prodForm.price}
                onChange={(e) =>
                  setProdForm({ ...prodForm, price: parseFloat(e.target.value) || 0 })
                }
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Danh mục</label>
              <select
                value={prodForm.category_id || ''}
                onChange={(e) =>
                  setProdForm({
                    ...prodForm,
                    category_id: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Chọn danh mục</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Mô tả ngắn</label>
            <textarea
              rows={2}
              value={prodForm.description || ''}
              onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })}
              placeholder="Thành phần, hương vị đặc trưng..."
              className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Upload ảnh */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Hình ảnh món ăn
              </label>
              <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-lg text-[11px]">
                <button
                  type="button"
                  onClick={() => setImageInputMode('FILE')}
                  className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                    imageInputMode === 'FILE'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Tải file từ máy
                </button>
                <button
                  type="button"
                  onClick={() => setImageInputMode('URL')}
                  className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                    imageInputMode === 'URL'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Dán link ảnh (URL)
                </button>
              </div>
            </div>

            {imageInputMode === 'URL' ? (
              <div className="space-y-1.5">
                <div className="relative">
                  <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    placeholder="Dán link ảnh tại đây (VD: https://.../tiramisu.jpg)"
                    value={prodForm.image_url}
                    onChange={(e) => {
                      setImagePreviewError(false);
                      setProdForm({ ...prodForm, image_url: e.target.value.trim() });
                    }}
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  💡 Mẹo: Khi tìm ảnh trên Google/Yahoo, bạn bấm chuột phải vào ảnh ➔ chọn <strong className="text-slate-600">"Sao chép địa chỉ hình ảnh" (Copy image address)</strong> rồi dán vào đây.
                </p>
              </div>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handleImageFileChange}
                  className="hidden"
                />

                <button
                  type="button"
                  disabled={uploadingImage}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full cursor-pointer flex items-center justify-center gap-2 px-3 py-3 border-2 border-dashed border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 rounded-xl transition text-xs text-slate-600 font-semibold"
                >
                  {uploadingImage ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  ) : (
                    <Upload className="w-4 h-4 text-blue-600" />
                  )}
                  <span>{uploadingImage ? 'Đang lưu ảnh lên máy chủ...' : 'Chọn file ảnh từ máy (.jpg, .png, .webp)'}</span>
                </button>
              </div>
            )}

            {/* Khung hiển thị ảnh preview */}
            {prodForm.image_url && (
              <div className="mt-2.5 flex items-start gap-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-white relative shrink-0 flex items-center justify-center shadow-xs">
                  {!imagePreviewError ? (
                    <img
                      src={prodForm.image_url}
                      alt="Preview món ăn"
                      onError={() => setImagePreviewError(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-rose-500 p-1 text-center bg-rose-50">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreviewError(false);
                      setProdForm({ ...prodForm, image_url: '' });
                    }}
                    title="Xóa ảnh này"
                    className="absolute top-1 right-1 bg-black/60 hover:bg-rose-600 text-white rounded-full p-0.5 transition shadow-sm cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1 min-w-0 text-xs py-0.5">
                  {!imagePreviewError ? (
                    <>
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                        <span>Đã nạp ảnh thành công</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-1" title={prodForm.image_url}>
                        {prodForm.image_url.startsWith('blob:') ? 'Ảnh xem trước từ máy' : prodForm.image_url}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="font-semibold text-rose-600 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Ảnh không tải được hoặc link không hợp lệ</span>
                      </div>
                      <p className="text-[11px] text-rose-500/90 mt-1 leading-relaxed">
                        File bạn vừa chọn có thể là trang web HTML (do Yahoo lưu nhầm) hoặc link bị chặn. Hãy bấm nút (X) để dán link khác hoặc chọn file ảnh .jpg/.png thật nhé!
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Toppings Management */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-800 block">
                  Topping / Tùy chọn thêm của món
                </label>
                <p className="text-[10px] text-slate-400">
                  Món không có topping để trống. Món có topping khách sẽ được chọn khi gọi món.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddEmptyTopping}
              >
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                <span>Thêm Topping</span>
              </Button>
            </div>

            {prodForm.toppings && prodForm.toppings.length > 0 ? (
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {prodForm.toppings.map((top, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      placeholder="Tên topping (vd: Trân châu trắng)"
                      value={top.name}
                      onChange={(e) => handleToppingChange(idx, 'name', e.target.value)}
                      className="flex-1"
                    />
                    <div className="relative w-28">
                      <Input
                        type="number"
                        min="0"
                        step="1000"
                        placeholder="Giá thêm"
                        value={top.price || ''}
                        onChange={(e) => handleToppingChange(idx, 'price', Number(e.target.value))}
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">
                        đ
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveTopping(idx)}
                      className="hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-2.5 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                Chưa có topping nào. Bấm "+ Thêm Topping" để cài đặt.
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_available_chk"
              checked={prodForm.is_available ?? true}
              onChange={(e) => setProdForm({ ...prodForm, is_available: e.target.checked })}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_available_chk" className="text-xs font-semibold text-slate-700">
              Món ăn đang còn hàng phục vụ
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsProductModalOpen(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Lưu món ăn</span>
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Thêm / Sửa Category */}
      <Dialog
        open={isCatModalOpen}
        onOpenChange={setIsCatModalOpen}
        title={editingCategory ? 'Sửa danh mục' : 'Thêm danh mục mới'}
        maxWidth="sm"
      >
        <form onSubmit={handleSaveCategory} className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Tên danh mục <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              placeholder="VD: Sinh tố & Nước ép"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Thứ tự hiển thị
            </label>
            <Input
              type="number"
              value={catForm.display_order}
              onChange={(e) =>
                setCatForm({ ...catForm, display_order: parseInt(e.target.value, 10) || 0 })
              }
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="cat_active_chk"
              checked={catForm.is_active ?? true}
              onChange={(e) => setCatForm({ ...catForm, is_active: e.target.checked })}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="cat_active_chk" className="text-xs font-semibold text-slate-700">
              Hiển thị công khai trên thực đơn
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCatModalOpen(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Lưu danh mục</span>
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
