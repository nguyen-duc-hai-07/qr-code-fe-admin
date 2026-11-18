import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeftRight,
  X,
  Search,
  Check,
  Plus,
  Minus,
  Loader2,
  UtensilsCrossed,
  Sparkles,
} from 'lucide-react';
import { menuApi } from '@/api/menu.api';
import { orderApi } from '@/api/order.api';
import { Product, ProductTopping } from '@/types/product';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/utils/error';
import { formatCurrency } from '@/utils/format';

export interface ExchangeItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  itemId: number;
  orderCode: string;
  oldProductName: string;
  oldQuantity: number;
  oldUnitPrice?: number;
  tableName?: string;
  zone?: string;
  onSuccess: () => void;
}

export const ExchangeItemModal: React.FC<ExchangeItemModalProps> = ({
  isOpen,
  onClose,
  orderId,
  itemId,
  orderCode,
  oldProductName,
  oldQuantity,
  oldUnitPrice,
  tableName,
  zone,
  onSuccess,
}) => {
  const { showSuccess, showError } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(oldQuantity || 1);
  const [selectedToppings, setSelectedToppings] = useState<ProductTopping[]>([]);
  const [note, setNote] = useState(`Đổi từ món ${oldProductName}`);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setQuantity(oldQuantity || 1);
    setSelectedProduct(null);
    setSelectedToppings([]);
    setSearchKeyword('');
    setNote(`Đổi từ món ${oldProductName}`);

    setLoadingProducts(true);
    menuApi
      .getProducts()
      .then((res) => {
        const available = (res.data || []).filter((p) => p.is_available !== false);
        setProducts(available);
      })
      .catch((err) => {
        console.error('Failed to fetch products', err);
        showError('Không thể tải danh sách món ăn');
      })
      .finally(() => setLoadingProducts(false));
  }, [isOpen, oldProductName, oldQuantity]);

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
  const newSubtotal = unitPrice * quantity;
  const oldSubtotal = (oldUnitPrice ? Number(oldUnitPrice) : 0) * (oldQuantity || 1);
  const priceDiff = newSubtotal - oldSubtotal;

  const handleConfirmExchange = async () => {
    if (!selectedProduct) {
      showError('Vui lòng chọn món mới muốn đổi!');
      return;
    }

    try {
      setSubmitting(true);
      await orderApi.exchangeOrderItemAdmin(orderId, itemId, {
        product_id: selectedProduct.id,
        quantity: quantity,
        note: note.trim() || undefined,
        options: selectedToppings.map((t) => ({
          name: t.name,
          price: t.price,
        })),
      });

      showSuccess(`Đã đổi sang món "${selectedProduct.name}" thành công!`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error('Exchange item failed', err);
      showError(getErrorMessage(err, 'Đổi món trong đơn hàng thất bại!'));
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
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-gradient-to-r from-amber-50/80 via-white to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 shadow-xs">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                Đổi món cho khách
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

        {/* Current Item Banner */}
        <div className="bg-amber-50/90 border-b border-amber-200/80 px-4 py-2.5 flex items-center justify-between text-xs text-amber-900">
          <div>
            <span className="font-medium text-amber-700">Món hiện tại: </span>
            <strong className="font-bold text-amber-950 text-sm">
              {oldQuantity}× {oldProductName}
            </strong>
          </div>
          {oldUnitPrice ? (
            <span className="font-bold text-amber-800 bg-white/80 px-2 py-0.5 rounded-lg border border-amber-200/70">
              {formatCurrency(oldSubtotal)}
            </span>
          ) : null}
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Step 1: Search & Pick Replacement */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Chọn món mới thay thế:
            </label>
            <div className="relative mb-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Tìm món theo tên hoặc danh mục..."
                className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 outline-none transition-all"
              />
            </div>

            {loadingProducts ? (
              <div className="py-8 flex items-center justify-center text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin mr-2 text-amber-700" />
                Đang tải danh sách món...
              </div>
            ) : (
              <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-2xl p-1 divide-y divide-slate-100 bg-slate-50/50">
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
                            ? 'bg-amber-100/90 text-amber-950 font-bold border border-amber-300 shadow-2xs'
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
                          <span className="font-bold text-amber-800">
                            {formatCurrency(p.price)}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-amber-800" />}
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
                  <span className="text-xs font-bold text-slate-700">Số lượng món mới:</span>
                  <p className="text-[11px] text-slate-400">Điều chỉnh số lượng cần phục vụ</p>
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
                    <Sparkles className="w-3 h-3 text-amber-600" />
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
                              ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold'
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
                  Ghi chú chế biến (tùy chọn):
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ví dụ: Ít đá, không đường, đổi từ món cũ..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 outline-none"
                />
              </div>

              {/* Summary / Price Preview */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-amber-900">Thành tiền món mới:</span>
                  <p className="text-[11px] text-amber-700">
                    {quantity} × {formatCurrency(unitPrice)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-amber-900">
                    {formatCurrency(newSubtotal)}
                  </span>
                  {oldUnitPrice ? (
                    <p className={`text-[11px] font-bold ${priceDiff > 0 ? 'text-emerald-700' : priceDiff < 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                      {priceDiff > 0 ? `+${formatCurrency(priceDiff)}` : priceDiff < 0 ? formatCurrency(priceDiff) : 'Giá không đổi'}
                    </p>
                  ) : null}
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
            onClick={handleConfirmExchange}
            className="px-5 py-2.5 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-900/15 flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowLeftRight className="w-4 h-4" />
            )}
            <span>Xác nhận đổi món</span>
          </button>
        </div>
      </div>
    </div>
  );
};
