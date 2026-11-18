import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Minus,
  Trash2,
  Search,
  CheckCircle2,
  Loader2,
  Coffee,
  X,
  Store,
  ChevronDown,
} from 'lucide-react';
import { menuApi } from '@/api/menu.api';
import { tableApi } from '@/api/table.api';
import { orderApi } from '@/api/order.api';
import { Category } from '@/types/category';
import { Product } from '@/types/product';
import { StoreTable } from '@/types/table';
import { Order } from '@/types/order';
import { formatCurrency } from '@/utils/format';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/utils/error';

interface CartItem {
  product: Product;
  quantity: number;
  note?: string;
}

export const AdminPosPage: React.FC = () => {
  const { showSuccess, showError, showWarning } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<StoreTable[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState('');

  // POS State
  const [orderMode, setOrderMode] = useState<'CREATE_NEW' | 'ADD_EXISTING'>('CREATE_NEW');
  const [isInfoCollapsed, setIsInfoCollapsed] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  const { playOrderNotificationSound } = useWebSocket();

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [catsRes, prodsRes, tablesRes] = await Promise.all([
        menuApi.getAllCategoriesAdmin(),
        menuApi.getProducts(),
        tableApi.getAllTablesAdmin(),
      ]);
      setCategories(catsRes.data || []);
      setProducts(prodsRes.data || []);
      const activeTables = (tablesRes.data || []).filter((t: StoreTable) => t.is_active);
      setTables(activeTables);
      if (activeTables.length > 0) {
        setSelectedTableId(activeTables[0].id);
      }
    } catch (err) {
      console.error('Failed to load POS data', err);
    } finally {
      setLoading(false);
    }
  };

  // Map category names for quick lookup
  const categoryMap = useMemo(() => {
    const map = new Map<number, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat =
        selectedCategoryId === 'all'
          ? true
          : p.category_id === Number(selectedCategoryId);
      const matchSearch =
        !searchKeyword.trim() ||
        p.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchKeyword.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategoryId, searchKeyword]);

  // Cart operations
  const addToCart = (product: Product) => {
    if (!product.is_available) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: number, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: qty } : item
      )
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setOrderNote('');
  };

  // Calculations
  const totalAmount = useMemo(() => {
    return cart.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0
    );
  }, [cart]);

  const totalCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Submit Order
  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      showWarning('Vui lòng chọn ít nhất 1 món ăn vào order!');
      return;
    }
    if (!selectedTableId) {
      showWarning('Vui lòng chọn bàn để tạo đơn!');
      return;
    }

    try {
      setIsSubmitting(true);
      const orderPayload = {
        order_type: 'AT_TABLE' as const,
        table_id: selectedTableId,
        customer_name: customerName.trim() || undefined,
        note: orderNote.trim() || undefined,
        items: cart.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
          note: i.note,
        })),
      };

      const res = await orderApi.createOrder(orderPayload);
      playOrderNotificationSound();
      setCompletedOrder(res.data);
      clearCart();
      showSuccess('Tạo đơn hàng POS thành công!');
    } catch (err: unknown) {
      showError(getErrorMessage(err, 'Không thể tạo đơn hàng POS!'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTableObj = tables.find((t) => t.id === selectedTableId);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 font-semibold text-slate-600 text-sm">
          Đang tải dữ liệu quầy bán hàng (POS)...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3.5 max-w-7xl mx-auto">
      {/* 1. Cửa hàng của bạn Header Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-500 font-medium">Cửa hàng của bạn</div>
          <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
            Hoàng An Coffee & Billiard
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
          <Store className="w-4 h-4 text-blue-600" />
          <span>Hệ thống bán hàng trực tiếp tại quầy</span>
        </div>
      </div>

      {/* 2. Quota announcement bar (Matching template) */}
      <div className="bg-blue-50/60 text-blue-900 border border-blue-100 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between text-xs font-semibold gap-1.5 shadow-2xs">
        <div className="flex items-center gap-1.5">
          <span>Còn 39 / 50 đơn miễn phí tháng này</span>
        </div>
        <div className="text-slate-500 text-[11px] font-normal">
          Số đơn miễn phí tự đặt lại vào đầu tháng mới.
        </div>
      </div>

      {/* 3. Section Title "Menu" */}
      <div className="text-center py-0.5">
        <h2 className="text-base font-bold text-slate-900 tracking-wide">Menu</h2>
      </div>

      {/* 4. Main 2-Column POS Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] gap-4 items-start">
        {/* Left Column: Order Form, Categories & Product Cards */}
        <div className="space-y-3.5">
          {/* Card: Thông tin order */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-sm text-slate-900">Thông tin order</span>
                <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setOrderMode('CREATE_NEW')}
                    className={`px-3 py-1 rounded-md transition-all ${
                      orderMode === 'CREATE_NEW'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tạo mới
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderMode('ADD_EXISTING')}
                    className={`px-3 py-1 rounded-md transition-all ${
                      orderMode === 'ADD_EXISTING'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Thêm vào order có sẵn
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsInfoCollapsed(!isInfoCollapsed)}
                className="text-xs text-slate-500 hover:text-slate-700 font-medium px-2.5 py-1 rounded-lg hover:bg-slate-50 border border-slate-200/80 transition"
              >
                {isInfoCollapsed ? 'Hiện' : 'Ẩn'}
              </button>
            </div>

            {!isInfoCollapsed && (
              <div className="space-y-2.5 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="relative">
                    <select
                      value={selectedTableId || ''}
                      onChange={(e) => setSelectedTableId(Number(e.target.value))}
                      className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                    >
                      {tables.map((tbl) => (
                        <option key={tbl.id} value={tbl.id}>
                          {tbl.location_name} - {tbl.zone}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Tên khách"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder-slate-400"
                    />
                  </div>
                </div>

                <textarea
                  placeholder="Ghi chú..."
                  rows={2}
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-slate-800 placeholder-slate-400"
                />
              </div>
            )}
          </div>

          {/* Category Filter Pills & Search */}
          <div className="space-y-2.5">
            {/* Horizontal Pills */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              <button
                onClick={() => setSelectedCategoryId('all')}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                  selectedCategoryId === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80 shadow-2xs'
                }`}
              >
                Tất cả ({products.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(String(cat.id))}
                  className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                    selectedCategoryId === String(cat.id)
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80 shadow-2xs'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm kiếm món trong thực đơn..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full bg-white text-xs rounded-xl pl-9 pr-8 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs text-slate-800 placeholder-slate-400"
              />
              {searchKeyword && (
                <button
                  onClick={() => setSearchKeyword('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Product Cards Grid - Clean, tidy horizontal cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredProducts.map((product) => {
              const inCart = cart.find((i) => i.product.id === product.id);
              const isOut = !product.is_available;
              const catName = (product.category_id && categoryMap.get(product.category_id)) || 'Đồ uống';

              return (
                <div
                  key={product.id}
                  className={`bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex items-center justify-between gap-3 ${
                    isOut ? 'opacity-50 bg-slate-50/50' : 'hover:border-slate-300'
                  }`}
                >
                  {/* Left: Thumbnail & Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden shrink-0 relative flex items-center justify-center border border-slate-100">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Coffee className="w-6 h-6 text-slate-300" />
                      )}
                      {inCart && (
                        <div className="absolute top-1 right-1 bg-blue-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow">
                          {inCart.quantity}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4
                        className="font-bold text-xs sm:text-sm text-slate-900 truncate"
                        title={product.name}
                      >
                        {product.name}
                      </h4>
                      <p className="text-[11px] text-blue-600 font-medium mt-0.5">
                        {catName}
                      </p>
                    </div>
                  </div>

                  {/* Right: Price badge & Quick Add Button */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={isOut}
                      onClick={() => addToCart(product)}
                      className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg shadow-2xs transition-all flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Thêm món vào order"
                    >
                      <span>{formatCurrency(product.price)}</span>
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200/80 text-xs font-medium">
              Không tìm thấy món ăn nào phù hợp với từ khóa & danh mục đã chọn.
            </div>
          )}
        </div>

        {/* Right Column: Order Cart Summary */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 sticky top-4 flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="font-bold text-sm text-slate-800">
              Đơn bàn: {selectedTableObj?.location_name || 'Chưa chọn'}
            </span>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-rose-500 hover:text-rose-700 font-semibold"
              >
                Xóa hết
              </button>
            )}
          </div>

          {/* Cart items or Empty placeholder */}
          {cart.length === 0 ? (
            <div className="py-14 text-center text-slate-400 text-sm font-medium">
              Chưa có sản phẩm
            </div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-50 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-xs text-slate-800 truncate">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-blue-600 font-bold">
                      {formatCurrency(Number(item.product.price) * item.quantity)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center text-xs font-bold text-slate-900">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="w-6 h-6 rounded-lg bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white transition"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-1 text-slate-300 hover:text-rose-500 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Total Row */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700">Tổng:</span>
            <span className="text-lg font-black text-slate-900">
              {formatCurrency(totalAmount)}
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="button"
            disabled={isSubmitting || cart.length === 0}
            onClick={handleSubmitOrder}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang tạo order...</span>
              </>
            ) : (
              <span>Tạo order</span>
            )}
          </button>
        </div>
      </div>

      {/* Success Modal */}
      {completedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">Tạo Order Thành Công!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Đơn đã được chuyển tức thì đến danh sách order và màn hình bếp.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-left space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã đơn:</span>
                <span className="font-bold text-slate-800">#{completedOrder.order_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bàn:</span>
                <span className="font-bold text-blue-600">
                  {completedOrder.table_name}{completedOrder.zone ? ` - ${completedOrder.zone}` : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tổng tiền:</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(completedOrder.total_amount)}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setCompletedOrder(null)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition"
              >
                Tiếp tục bán hàng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
