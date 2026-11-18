import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  X,
  Search,
  Check,
  Minus,
  Loader2,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { menuApi } from '@/api/menu.api';
import { orderApi } from '@/api/order.api';
import { Product, ProductTopping } from '@/types/product';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/utils/error';
import { formatCurrency } from '@/utils/format';

export interface AddOrderItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  orderCode: string;
  tableName?: string;
  zone?: string;
  onSuccess: () => void;
}

export const AddOrderItemModal: React.FC<AddOrderItemModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderCode,
  tableName,
  zone,
  onSuccess,
}) => {
  const { showSuccess, showError } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedToppings, setSelectedToppings] = useState<ProductTopping[]>([]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setQuantity(1);
    setSelectedProduct(null);
    setSelectedToppings([]);
    setSearchKeyword('');
    setNote('');

    setLoadingProducts(true);
    menuApi
      .getProducts()
      .then((res) => {
        const available = (res.data || []).filter((p) => p.is_available !== false);
        setProducts(available);
      })
      .catch((err) => {
        console.error('Failed to fetch products', err);
        showError('Không thể tải danh sách món');
      })
      .finally(() => setLoadingProducts(false));
  }, [isOpen]);

  const filteredProducts = useMemo(() => {
    if (!searchKeyword.trim()) return products;
    const kw = searchKeyword.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(kw) ||
        (p.category_name && p.category_name.toLowerCase().includes(kw))
    );
  }, [products, searchKeyword]);

  const toggleTopping = (topping: ProductTopping) => {
    setSelectedToppings((prev) => {
      const exists = prev.some((t) => t.name === topping.name);
      if (exists) {
        return prev.filter((t) => t.name !== topping.name);
      }
      return [...prev, topping];
    });
  };

  const toppingsPrice = selectedToppings.reduce((sum, t) => sum + (Number(t.price) || 0), 0);
  const unitPrice = (selectedProduct ? Number(selectedProduct.price) : 0) + toppingsPrice;
  const subtotal = unitPrice * quantity;

  const handleConfirmAdd = async () => {
    if (!selectedProduct) {
      showError('Vui lòng chọn món muốn thêm!');
      return;
    }

    try {
      setSubmitting(true);
      await orderApi.addOrderItemAdmin(orderId, {
        product_id: selectedProduct.id,
        quantity: quantity,
        note: note.trim() || undefined,
        options: selectedToppings.map((t) => ({
          name: t.name,
          price: t.price,
        })),
      });

      showSuccess(`Đã thêm món "${selectedProduct.name}" vào đơn #${orderCode}!`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error('Add item failed', err);
      showError(getErrorMessage(err, 'Thêm món vào đơn hàng thất bại!'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={() => !submitting && onClose()}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-xl w-full z-10 overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-gradient-to-r from-emerald-50/80 via-white to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                Thêm món vào đơn hàng
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>Đơn: <strong className="text-slate-800">#{orderCode}</strong></span>
                {tableName && (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-amber-800">
                      {tableName}{zone ? ` - ${zone}` : ''}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Step 1: Search & Pick Product */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tìm & chọn món cần thêm:
            </label>
            <div className="relative mb-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Tìm món theo tên hoặc danh mục..."
                className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-none transition-all"
              />
            </div>

            {loadingProducts ? (
              <div className="py-8 flex items-center justify-center text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin mr-2 text-emerald-700" />
                Đang tải danh sách món...
              </div>
            ) : (
              <div className="max-h-44 overflow-y-auto border border-slate-100 rounded-2xl p-1 divide-y divide-slate-100 bg-slate-50/50">
                {filteredProducts.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">Không tìm thấy món phù hợp</p>
                ) : (
                  filteredProducts.map((p) => {
                    const isSelected = selectedProduct?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedProduct(p);
                          setSelectedToppings([]);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between text-xs transition-all ${
                          isSelected
                            ? 'bg-emerald-100/90 text-emerald-950 font-bold border border-emerald-300 shadow-2xs'
                            : 'hover:bg-white text-slate-800'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-xs leading-snug truncate">{p.name}</p>
                          {p.category_name && (
                            <span className="text-[10px] text-slate-500 font-normal">
                              {p.category_name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-emerald-800">
                            {formatCurrency(p.price)}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-emerald-800" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Step 2: Customization (Quantity, Toppings, Note) when selected */}
          {selectedProduct && (
            <div className="space-y-3 pt-2 border-t border-slate-100 animate-in fade-in duration-150">
              {/* Quantity */}
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl">
                <div>
                  <span className="text-xs font-bold text-slate-700">Số lượng:</span>
                  <p className="text-[11px] text-slate-400">Điều chỉnh số lượng thêm</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-7 h-7 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-30"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm font-bold text-slate-900">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-7 h-7 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Toppings if present */}
              {selectedProduct.toppings && selectedProduct.toppings.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    <span>Topping tùy chọn ({selectedProduct.name}):</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProduct.toppings.map((top) => {
                      const isChosen = selectedToppings.some((t) => t.name === top.name);
                      return (
                        <button
                          key={top.name}
                          type="button"
                          onClick={() => toggleTopping(top)}
                          className={`text-xs px-2.5 py-1.5 rounded-xl border transition-all ${
                            isChosen
                              ? 'bg-emerald-100 border-emerald-300 text-emerald-900 font-bold'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {top.name} (+{formatCurrency(top.price)})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi chú món (tùy chọn):
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ví dụ: Ít đá, mang ra trước..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-none"
                />
              </div>

              {/* Summary / Price Preview */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-emerald-900">Cộng thêm vào đơn:</span>
                  <p className="text-[11px] text-emerald-700">
                    {quantity} × {formatCurrency(unitPrice)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-emerald-900">
                    +{formatCurrency(subtotal)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-white rounded-xl transition-all"
          >
            Bỏ qua
          </button>
          <button
            type="button"
            disabled={submitting || !selectedProduct}
            onClick={handleConfirmAdd}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/15 flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>Thêm món vào đơn</span>
          </button>
        </div>
      </div>
    </div>
  );
};
