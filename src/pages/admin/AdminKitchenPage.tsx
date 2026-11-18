import React, { useState, useEffect, useMemo } from 'react';
import {
  UtensilsCrossed,
  CheckCircle2,
  Loader2,
  ChefHat,
  RefreshCw,
  Volume2,
  Clock,
  Flame,
  XCircle,
  Trash2,
  AlertTriangle,
  AlertCircle,
  X,
  ArrowLeftRight,
  Plus,
} from 'lucide-react';
import { orderApi } from '@/api/order.api';
import { Order, OrderStatus } from '@/types/order';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/utils/error';
import { formatTimeAgo } from '@/utils/format';
import { Card, CardContent, Badge, Button } from '@/components/ui';
import { ExchangeItemModal } from '@/components/admin/ExchangeItemModal';
import { AddOrderItemModal } from '@/components/admin/AddOrderItemModal';

const QUICK_CANCEL_REASONS = [
  'Khách yêu cầu hủy',
  'Hết nguyên liệu pha chế',
  'Khách đợi lâu nên đổi ý',
  'Gọi trùng đơn / làm lại',
  'Khách đổi sang món khác',
];

export const AdminKitchenPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ACTIVE');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Modal states for cancelling order & items
  const [cancelOrderModal, setCancelOrderModal] = useState<{
    orderId: number;
    orderCode: string;
    tableName?: string;
    zone?: string;
  } | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Khách yêu cầu hủy');

  const [cancelItemModal, setCancelItemModal] = useState<{
    orderId: number;
    itemId: number;
    productName: string;
    orderCode: string;
  } | null>(null);

  const [exchangeItemTarget, setExchangeItemTarget] = useState<{
    orderId: number;
    itemId: number;
    orderCode: string;
    oldProductName: string;
    oldQuantity: number;
    oldUnitPrice?: number;
    tableName?: string;
    zone?: string;
  } | null>(null);

  const [addItemTarget, setAddItemTarget] = useState<{
    orderId: number;
    orderCode: string;
    tableName?: string;
    zone?: string;
  } | null>(null);

  const { subscribe, playOrderNotificationSound } = useWebSocket();
  const { showError, showSuccess } = useToast();

  // Load orders
  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await orderApi.getAllOrdersAdmin();
      setOrders(res.data || []);
    } catch (err) {
      console.error('Failed to load kitchen orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Real-time WebSocket updates
  useEffect(() => {
    const unsubscribe = subscribe((payload) => {
      if (
        payload.action === 'NEW_ORDER' ||
        payload.action === 'ORDER_STATUS_UPDATED' ||
        payload.action === 'ORDER_STATUS_CHANGED' ||
        payload.action === 'ORDER_ITEM_REMOVED'
      ) {
        loadOrders();
        window.dispatchEvent(new CustomEvent('kitchen_orders_changed'));
        if (payload.action === 'NEW_ORDER') {
          playOrderNotificationSound();
        }
      }
    });
    return unsubscribe;
  }, [subscribe, playOrderNotificationSound]);

  // Update Status (PENDING -> PREPARING -> COMPLETED)
  const handleUpdateStatus = async (orderId: number, newStatus: OrderStatus) => {
    try {
      setUpdatingId(orderId);
      await orderApi.updateOrderStatusAdmin(orderId, { status: newStatus });
      await loadOrders();
      window.dispatchEvent(new CustomEvent('kitchen_orders_changed'));
    } catch (err) {
      console.error('Update status failed', err);
      showError(getErrorMessage(err, 'Không thể cập nhật trạng thái đơn hàng!'));
    } finally {
      setUpdatingId(null);
    }
  };

  // Open cancel order modal
  const openCancelOrderModal = (order: Order) => {
    setCancelOrderModal({
      orderId: order.id,
      orderCode: order.order_code,
      tableName: order.table_name,
      zone: order.zone,
    });
    setCancelReason('Khách yêu cầu hủy');
  };

  // Confirm cancel order
  const handleConfirmCancelOrder = async () => {
    if (!cancelOrderModal) return;
    try {
      setUpdatingId(cancelOrderModal.orderId);
      await orderApi.updateOrderStatusAdmin(cancelOrderModal.orderId, {
        status: 'CANCELLED',
        note: cancelReason.trim() || 'Hủy tại màn hình bếp',
      });
      await loadOrders();
      window.dispatchEvent(new CustomEvent('kitchen_orders_changed'));
      showSuccess(`Đã hủy đơn hàng #${cancelOrderModal.orderCode}`);
      setCancelOrderModal(null);
    } catch (err) {
      console.error('Cancel order failed', err);
      showError(getErrorMessage(err, 'Không thể hủy đơn hàng!'));
    } finally {
      setUpdatingId(null);
    }
  };

  // Open cancel individual item modal
  const openCancelItemModal = (
    orderId: number,
    itemId: number,
    productName: string,
    orderCode: string
  ) => {
    setCancelItemModal({ orderId, itemId, productName, orderCode });
  };

  // Confirm cancel individual item
  const handleConfirmCancelItem = async () => {
    if (!cancelItemModal) return;
    try {
      setUpdatingId(cancelItemModal.orderId);
      await orderApi.removeOrderItemAdmin(cancelItemModal.orderId, cancelItemModal.itemId);
      await loadOrders();
      window.dispatchEvent(new CustomEvent('kitchen_orders_changed'));
      showSuccess(`Đã hủy món "${cancelItemModal.productName}" khỏi đơn`);
      setCancelItemModal(null);
    } catch (err) {
      console.error('Remove item failed', err);
      showError(getErrorMessage(err, 'Không thể hủy món khỏi đơn hàng!'));
    } finally {
      setUpdatingId(null);
    }
  };

  const preparingCount = useMemo(
    () => orders.filter((o) => o.status === 'PREPARING').length,
    [orders]
  );
  const pendingCount = useMemo(
    () => orders.filter((o) => o.status === 'PENDING').length,
    [orders]
  );
  const activeCount = preparingCount + pendingCount;

  const getKitchenPriority = (status: OrderStatus): number => {
    if (status === 'PREPARING') return 1;
    if (status === 'PENDING') return 2;
    if (status === 'COMPLETED') return 3;
    if (status === 'CANCELLED') return 4;
    return 5;
  };

  const displayOrders = useMemo(() => {
    const filtered = orders.filter((o) => {
      if (filterStatus === 'ACTIVE') {
        return o.status === 'PREPARING' || o.status === 'PENDING';
      }
      if (filterStatus === 'PREPARING') return o.status === 'PREPARING';
      if (filterStatus === 'PENDING') return o.status === 'PENDING';
      if (filterStatus === 'COMPLETED') return o.status === 'COMPLETED';
      if (filterStatus === 'ALL') return true;
      return o.status === filterStatus;
    });

    return [...filtered].sort((a, b) => {
      const pA = getKitchenPriority(a.status);
      const pB = getKitchenPriority(b.status);
      if (pA !== pB) {
        return pA - pB;
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [orders, filterStatus]);

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'PREPARING':
        return (
          <Badge variant="warning">
            <Flame className="w-3 h-3 mr-1" />
            <span>Đang chế biến</span>
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge variant="default">
            <Clock className="w-3 h-3 mr-1" />
            <span>Chờ tiếp nhận</span>
          </Badge>
        );
      case 'COMPLETED':
        return <Badge variant="success">Đã hoàn thành</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Đã hủy</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* 1. Header Bar */}
      <Card>
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  Đơn Hàng Cần Chế Biến
                </h1>
                {activeCount > 0 && (
                  <Badge variant="warning">
                    {activeCount} đơn cần làm
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={playOrderNotificationSound}
            >
              <Volume2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Thử chuông</span>
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={loadOrders}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
        {[
          { key: 'ACTIVE', label: `Cần làm ngay (${activeCount})` },
          { key: 'PREPARING', label: `Đang chế biến (${preparingCount})` },
          { key: 'PENDING', label: `Chờ tiếp nhận (${pendingCount})` },
          { key: 'COMPLETED', label: 'Đã hoàn thành' },
          { key: 'ALL', label: 'Tất cả' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilterStatus(tab.key)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filterStatus === tab.key
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. Orders Grid (Tickets) */}
      {loading ? (
        <div className="flex h-72 items-center justify-center bg-white rounded-2xl border border-slate-200/80">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 font-semibold text-slate-600 text-xs">Đang tải phiếu chế biến...</span>
        </div>
      ) : displayOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center shadow-xs">
          <UtensilsCrossed className="w-10 h-10 mx-auto mb-2 opacity-30 text-blue-600" />
          <p className="font-bold text-slate-800 text-sm">Hiện không có đơn nào đang cần làm</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Khi khách quét QR hoặc thu ngân tạo order mới, phiếu sẽ hiển thị và phát chuông ngay tại đây.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {displayOrders.map((order) => {
            const isUpdating = updatingId === order.id;
            const isPreparing = order.status === 'PREPARING';
            const isPending = order.status === 'PENDING';

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl border shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden ${
                  isPreparing
                    ? 'border-amber-300 ring-1 ring-amber-300/40 bg-amber-50/10'
                    : isPending
                    ? 'border-blue-200'
                    : 'border-slate-200/80'
                }`}
              >
                {/* Ticket Header */}
                <div className="p-3.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                      <span>{order.table_name || 'Mang về'}</span>
                      {order.zone && (
                        <span className="text-xs font-semibold text-slate-500">
                          - {order.zone}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span>Đơn #{order.order_code}</span>
                      <span>•</span>
                      <span>{formatTimeAgo(order.created_at)}</span>
                    </div>
                  </div>
                  {getStatusBadge(order.status)}
                </div>

                {/* Ticket Body: Items */}
                <div className="p-3.5 space-y-2.5 flex-1">
                  {order.customer_name && (
                    <div className="text-xs font-semibold text-slate-700">
                      Khách: {order.customer_name}
                    </div>
                  )}

                  {order.note && (
                    <div className="p-2 bg-amber-50/80 rounded-xl border border-amber-200/60 text-xs font-semibold text-amber-800">
                      Ghi chú: {order.note}
                    </div>
                  )}

                  <div className="divide-y divide-slate-100">
                    {(order.items || []).map((item) => (
                      <div
                        key={item.id}
                        className="py-2 flex items-start justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-xs text-slate-900 leading-snug">
                            {item.product_name}
                          </p>
                          {item.note && (
                            <p className="text-[11px] text-amber-600 font-medium">
                              {item.note}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-bold text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">
                            x{item.quantity}
                          </span>
                          {(isPending || isPreparing) && (
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() =>
                                  setExchangeItemTarget({
                                    orderId: order.id,
                                    itemId: item.id,
                                    orderCode: order.order_code,
                                    oldProductName: item.product_name,
                                    oldQuantity: item.quantity,
                                    oldUnitPrice: Number(item.unit_price),
                                    tableName: order.table_name,
                                    zone: order.zone,
                                  })
                                }
                                className="p-1 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors"
                                title="Đổi sang món khác cho khách"
                              >
                                <ArrowLeftRight className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => openCancelItemModal(order.id, item.id, item.product_name, order.order_code)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                title="Hủy món này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {(isPending || isPreparing) && (
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() =>
                          setAddItemTarget({
                            orderId: order.id,
                            orderCode: order.order_code,
                            tableName: order.table_name,
                            zone: order.zone,
                          })
                        }
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-2.5 py-1 rounded-xl flex items-center gap-1 transition-colors"
                        title="Thêm món mới vào đơn này"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Thêm món</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Ticket Footer: Actions */}
                <div className="p-3.5 bg-slate-50/50 border-t border-slate-100 flex gap-2">
                  {(isPending || isPreparing) && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isUpdating}
                      onClick={() => openCancelOrderModal(order)}
                      className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300"
                      title="Hủy đơn hàng"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      <span>Hủy đơn</span>
                    </Button>
                  )}

                  {isPending && (
                    <Button
                      variant="warning"
                      size="sm"
                      disabled={isUpdating}
                      onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                    >
                      {isUpdating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Flame className="w-3.5 h-3.5" />
                      )}
                      <span>Nhận làm món</span>
                    </Button>
                  )}

                  {isPreparing && (
                    <Button
                      variant="success"
                      size="sm"
                      disabled={isUpdating}
                      onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                      className="flex-1"
                    >
                      {isUpdating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>Xong tất cả món</span>
                    </Button>
                  )}

                  {order.status === 'COMPLETED' && (
                    <div className="w-full text-center text-xs font-semibold text-blue-600 py-1 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Đã phục vụ xong</span>
                    </div>
                  )}

                  {order.status === 'CANCELLED' && (
                    <div className="w-full text-center text-xs font-semibold text-rose-500 py-1 flex items-center justify-center gap-1">
                      <XCircle className="w-4 h-4" />
                      <span>Đã hủy đơn</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Beautiful Custom Cancel Order Modal */}
      {cancelOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={() => !updatingId && setCancelOrderModal(null)}
          />

          {/* Dialog Container */}
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full z-10 overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 pb-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-gradient-to-b from-rose-50/70 to-transparent">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-xs">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">
                    Xác nhận hủy đơn hàng
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                    <span>Mã đơn: <strong className="text-slate-800">#{cancelOrderModal.orderCode}</strong></span>
                    {cancelOrderModal.tableName && (
                      <>
                        <span>•</span>
                        <span className="font-semibold text-amber-800">
                          {cancelOrderModal.tableName}{cancelOrderModal.zone ? ` - ${cancelOrderModal.zone}` : ''}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={Boolean(updatingId)}
                onClick={() => setCancelOrderModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div className="p-3 bg-rose-50/80 border border-rose-200/80 rounded-2xl text-xs text-rose-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Đơn hàng này sẽ bị hủy toàn bộ và chuyển sang trạng thái <strong>ĐÃ HỦY</strong>. Thao tác này không thể hoàn tác.
                </p>
              </div>

              {/* Quick Preset Reasons */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Chọn nhanh lý do hủy:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_CANCEL_REASONS.map((reason) => {
                    const isSelected = cancelReason === reason;
                    return (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setCancelReason(reason)}
                        className={`text-xs px-2.5 py-1.5 rounded-xl font-medium transition-all ${
                          isSelected
                            ? 'bg-rose-600 text-white shadow-xs font-semibold'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {reason}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reason Input / Textarea */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Lý do hoặc ghi chú chi tiết:
                </label>
                <textarea
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Nhập lý do hủy đơn hàng..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none resize-none text-slate-800 transition-all"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                type="button"
                disabled={Boolean(updatingId)}
                onClick={() => setCancelOrderModal(null)}
                className="rounded-xl px-4 text-slate-700 hover:bg-white"
              >
                Không hủy
              </Button>
              <Button
                variant="destructive"
                size="sm"
                type="button"
                disabled={Boolean(updatingId)}
                onClick={handleConfirmCancelOrder}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-4 shadow-sm shadow-rose-600/30 flex items-center gap-1.5 font-bold"
              >
                {updatingId === cancelOrderModal.orderId ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                <span>Xác nhận hủy đơn</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Custom Cancel Individual Item Modal */}
      {cancelItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={() => !updatingId && setCancelItemModal(null)}
          />

          <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full z-10 overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 pb-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-gradient-to-b from-rose-50/50 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">
                    Hủy món khỏi đơn
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Đơn #{cancelItemModal.orderCode}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={Boolean(updatingId)}
                onClick={() => setCancelItemModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Bạn có chắc chắn muốn hủy món <strong className="text-slate-900">"{cancelItemModal.productName}"</strong> khỏi phiếu chế biến này không?
              </p>
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200/60 text-[11px] text-amber-800 font-medium">
                💡 Món này sẽ được gỡ khỏi danh sách làm bếp của đơn hàng.
              </div>
            </div>

            <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                type="button"
                disabled={Boolean(updatingId)}
                onClick={() => setCancelItemModal(null)}
                className="rounded-xl px-4 text-slate-700 hover:bg-white"
              >
                Giữ lại món
              </Button>
              <Button
                variant="destructive"
                size="sm"
                type="button"
                disabled={Boolean(updatingId)}
                onClick={handleConfirmCancelItem}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-4 shadow-sm shadow-rose-600/30 flex items-center gap-1.5 font-bold"
              >
                {updatingId === cancelItemModal.orderId ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>Hủy món này</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal Đổi món cho khách */}
      {exchangeItemTarget && (
        <ExchangeItemModal
          isOpen={Boolean(exchangeItemTarget)}
          onClose={() => setExchangeItemTarget(null)}
          orderId={exchangeItemTarget.orderId}
          itemId={exchangeItemTarget.itemId}
          orderCode={exchangeItemTarget.orderCode}
          oldProductName={exchangeItemTarget.oldProductName}
          oldQuantity={exchangeItemTarget.oldQuantity}
          oldUnitPrice={exchangeItemTarget.oldUnitPrice}
          tableName={exchangeItemTarget.tableName}
          zone={exchangeItemTarget.zone}
          onSuccess={loadOrders}
        />
      )}

      {/* 7. Modal Thêm món vào đơn cho khách */}
      {addItemTarget && (
        <AddOrderItemModal
          isOpen={Boolean(addItemTarget)}
          onClose={() => setAddItemTarget(null)}
          orderId={addItemTarget.orderId}
          orderCode={addItemTarget.orderCode}
          tableName={addItemTarget.tableName}
          zone={addItemTarget.zone}
          onSuccess={loadOrders}
        />
      )}
    </div>
  );
};
