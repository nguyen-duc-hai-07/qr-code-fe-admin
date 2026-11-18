import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Utensils,
  Clock,
  DollarSign,
  CheckCircle2,
  RefreshCw,
  Printer,
  ExternalLink,
  ChevronRight,
  X,
  CreditCard,
  ChefHat,
  Search,
} from 'lucide-react';
import { tableApi } from '@/api/table.api';
import { orderApi } from '@/api/order.api';
import { StoreTable } from '@/types/table';
import { Order } from '@/types/order';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { formatCurrency } from '@/utils/format';
import { Card, CardContent, Badge, Button, Input } from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/utils/error';

interface TableWithStatus {
  table: StoreTable;
  orders: Order[];
  status: 'empty' | 'serving' | 'waitingPayment';
  totalAmount: number;
  totalItemsCount: number;
  openedAt?: string;
}

export const AdminTableMapPage: React.FC = () => {
  const { showSuccess, showError, showConfirmModal } = useToast();
  const [tables, setTables] = useState<StoreTable[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');

  // Selected table for modal
  const [activeTableItem, setActiveTableItem] = useState<TableWithStatus | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const { subscribe } = useWebSocket();

  // 1. Fetch tables and active orders
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [tablesRes, ordersRes] = await Promise.all([
        tableApi.getAllTablesAdmin(),
        orderApi.getAllOrdersAdmin(),
      ]);
      setTables(tablesRes.data || []);
      setOrders((ordersRes.data || []).filter((o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED'));
    } catch (err) {
      console.error('Lỗi tải dữ liệu sơ đồ bàn:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 2. Real-time WebSocket listener
  useEffect(() => {
    const unsubscribe = subscribe((payload) => {
      if (
        payload.action === 'NEW_ORDER' ||
        payload.action === 'ORDER_STATUS_CHANGED' ||
        payload.action === 'ORDER_ITEM_REMOVED' ||
        payload.action === 'CALL_STAFF'
      ) {
        fetchData();
      }
    });
    return unsubscribe;
  }, [subscribe, fetchData]);

  // Danh sách các khu vực
  const zones = useMemo(() => {
    const list = Array.from(new Set(tables.map((t) => t.zone).filter(Boolean)));
    return ['ALL', ...list];
  }, [tables]);

  // 3. Tính toán trạng thái bàn
  const tablesWithStatus: TableWithStatus[] = useMemo(() => {
    return tables.map((table) => {
      const tableOrders = orders.filter((o) => o.table_id === table.id);

      if (tableOrders.length === 0) {
        return {
          table,
          orders: [],
          status: 'empty',
          totalAmount: 0,
          totalItemsCount: 0,
        };
      }

      const hasCooking = tableOrders.some(
        (o) => o.status === 'PENDING' || o.status === 'PREPARING'
      );

      const status: 'serving' | 'waitingPayment' = hasCooking ? 'serving' : 'waitingPayment';
      const totalAmount = tableOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
      const totalItemsCount = tableOrders.reduce(
        (sum, o) => sum + (o.items ? o.items.reduce((iSum, i) => iSum + i.quantity, 0) : 0),
        0
      );

      const openedAt = tableOrders.reduce((earliest, o) => {
        if (!earliest) return o.created_at;
        return new Date(o.created_at) < new Date(earliest) ? o.created_at : earliest;
      }, '' as string);

      return {
        table,
        orders: tableOrders,
        status,
        totalAmount,
        totalItemsCount,
        openedAt,
      };
    });
  }, [tables, orders]);

  // 4. Thống kê tổng quan
  const stats = useMemo(() => {
    const total = tablesWithStatus.length;
    const emptyCount = tablesWithStatus.filter((t) => t.status === 'empty').length;
    const servingCount = tablesWithStatus.filter((t) => t.status === 'serving').length;
    const waitingPaymentCount = tablesWithStatus.filter(
      (t) => t.status === 'waitingPayment'
    ).length;
    const totalRevenueActive = tablesWithStatus.reduce((sum, t) => sum + t.totalAmount, 0);

    return {
      total,
      emptyCount,
      servingCount,
      waitingPaymentCount,
      occupiedCount: servingCount + waitingPaymentCount,
      totalRevenueActive,
    };
  }, [tablesWithStatus]);

  // 5. Lọc bàn
  const filteredTables = useMemo(() => {
    return tablesWithStatus.filter((item) => {
      const matchZone = selectedZone === 'ALL' || item.table.zone === selectedZone;
      const matchKeyword =
        !searchKeyword.trim() ||
        item.table.location_name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        item.table.zone?.toLowerCase().includes(searchKeyword.toLowerCase());
      return matchZone && matchKeyword;
    });
  }, [tablesWithStatus, selectedZone, searchKeyword]);

  // 6. Thanh toán bàn
  const handlePaymentTable = (item: TableWithStatus) => {
    if (item.orders.length === 0) return;
    showConfirmModal({
      title: 'Xác nhận thanh toán',
      message: `Thanh toán cho ${item.table.location_name} - Tổng tiền: ${formatCurrency(item.totalAmount)}?`,
      description: 'Hệ thống sẽ hoàn thành tất cả đơn hàng hiện tại và giải phóng bàn này.',
      type: 'info',
      confirmText: 'Xác nhận thanh toán',
      cancelText: 'Hủy bỏ',
      onConfirm: async () => {
        try {
          setIsProcessingPayment(true);
          await Promise.all(
            item.orders.map((o) =>
              orderApi.updateOrderStatusAdmin(o.id, {
                status: 'COMPLETED',
                note: 'Thanh toán tại quầy thu ngân',
              })
            )
          );
          setActiveTableItem(null);
          await fetchData();
          showSuccess(`Đã thanh toán cho ${item.table.location_name} thành công!`);
        } catch (err) {
          console.error(err);
          showError(getErrorMessage(err, 'Thanh toán thất bại, vui lòng kiểm tra lại!'));
        } finally {
          setIsProcessingPayment(false);
        }
      },
    });
  };

  // Hoàn thành đơn lẻ
  const handleCompleteSingleOrder = async (orderId: number) => {
    try {
      await orderApi.updateOrderStatusAdmin(orderId, {
        status: 'COMPLETED',
        note: 'Hoàn thành từng đơn',
      });
      const [tablesRes, ordersRes] = await Promise.all([
        tableApi.getAllTablesAdmin(),
        orderApi.getAllOrdersAdmin(),
      ]);
      setTables(tablesRes.data);
      const remainingOrders = ordersRes.data.filter((o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
      setOrders(remainingOrders);

      if (activeTableItem) {
        const remainingTableOrders = remainingOrders.filter((o) => o.table_id === activeTableItem.table.id);
        if (remainingTableOrders.length === 0) {
          setActiveTableItem(null);
        } else {
          const hasCooking = remainingTableOrders.some(
            (o) => o.status === 'PENDING' || o.status === 'PREPARING'
          );
          const totalAmount = remainingTableOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
          const totalItemsCount = remainingTableOrders.reduce(
            (sum, o) => sum + (o.items ? o.items.reduce((iSum, i) => iSum + i.quantity, 0) : 0),
            0
          );
          setActiveTableItem({
            ...activeTableItem,
            orders: remainingTableOrders,
            status: hasCooking ? 'serving' : 'waitingPayment',
            totalAmount,
            totalItemsCount,
          });
        }
      }
      showSuccess('Đã hoàn thành đơn hàng!');
    } catch (err) {
      console.error(err);
      showError(getErrorMessage(err, 'Không thể hoàn thành đơn!'));
    }
  };

  // In bill
  const handlePrintBill = (item: TableWithStatus) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Phiếu Tạm Tính - ${item.table.location_name}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; font-size: 13px; color: #1e293b; }
            h2 { text-align: center; margin: 0 0 5px; font-size: 16px; }
            .info { text-align: center; font-size: 11px; color: #64748b; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { text-align: left; padding: 6px 0; border-bottom: 1px dashed #cbd5e1; }
            th { font-size: 11px; text-transform: uppercase; color: #64748b; }
            .right { text-align: right; }
            .total { font-size: 15px; font-weight: bold; margin-top: 15px; text-align: right; }
          </style>
        </head>
        <body>
          <h2>HOÀNG AN COFFEE & BILLIARD</h2>
          <div class="info">Hotline: 0986 013 093 • KĐT Mới Thành Công - KM - HP</div>
          <div style="font-weight: bold; font-size: 14px; margin-bottom: 5px;">PHIẾU TẠM TÍNH: ${item.table.location_name}</div>
          <div style="font-size: 11px; color: #64748b;">Thời gian in: ${new Date().toLocaleString('vi-VN')}</div>
          <table>
            <thead>
              <tr><th>Món</th><th class="right">SL</th><th class="right">Thành tiền</th></tr>
            </thead>
            <tbody>
              ${item.orders
                .flatMap((o) => o.items || [])
                .map(
                  (i) => `
                <tr>
                  <td>${i.product_name}</td>
                  <td class="right">${i.quantity}</td>
                  <td class="right">${Number(i.subtotal).toLocaleString('vi-VN')} đ</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
          <div class="total">Tổng tiền: ${item.totalAmount.toLocaleString('vi-VN')} đ</div>
          <div style="text-align: center; margin-top: 25px; font-size: 11px; color: #64748b;">Xin cảm ơn & Hẹn gặp lại quý khách!</div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* 1. Header Card */}
      <Card>
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Sơ Đồ Bàn & Trạng Thái Phục Vụ</span>
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Theo dõi tình trạng bàn trống, bàn đang phục vụ và chờ thanh toán theo thời gian thực
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </Button>
        </CardContent>
      </Card>

      {/* 2. Stat Cards - Shadcn Minimalist */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Tổng số bàn */}
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Tổng số bàn</p>
              <p className="text-lg font-bold text-slate-900">{stats.total}</p>
            </div>
          </CardContent>
        </Card>

        {/* Bàn trống */}
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Bàn trống</p>
              <p className="text-lg font-bold text-slate-800">{stats.emptyCount}</p>
            </div>
          </CardContent>
        </Card>

        {/* Đang phục vụ */}
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Đang phục vụ</p>
              <p className="text-lg font-bold text-blue-600">{stats.servingCount}</p>
            </div>
          </CardContent>
        </Card>

        {/* Chờ thanh toán */}
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Chờ thanh toán</p>
              <p className="text-lg font-bold text-amber-600">{stats.waitingPaymentCount}</p>
            </div>
          </CardContent>
        </Card>

        {/* Doanh thu tạm tính */}
        <Card className="col-span-2 lg:col-span-1 border-blue-200/80 bg-blue-50/40">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs shadow-blue-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-blue-900 font-semibold truncate">Tạm tính tại quán</p>
              <p className="text-base font-bold text-blue-700 truncate">
                {formatCurrency(stats.totalRevenueActive)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Zone Filter Pills & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {zones.map((zone) => (
            <button
              key={zone}
              onClick={() => setSelectedZone(zone)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                selectedZone === zone
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80'
              }`}
            >
              {zone === 'ALL' ? 'Tất cả khu vực' : zone}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Tìm tên bàn, số bàn..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* 4. Table Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {filteredTables.map((item) => {
          const isEmpty = item.status === 'empty';
          const isServing = item.status === 'serving';

          return (
            <div
              key={item.table.id}
              onClick={() => setActiveTableItem(item)}
              className={`rounded-2xl p-4 border transition-all cursor-pointer flex flex-col justify-between group hover:shadow-md select-none ${
                isEmpty
                  ? 'bg-white border-slate-200/80 text-slate-700 hover:border-slate-300'
                  : isServing
                  ? 'bg-blue-50/50 border-blue-200 text-blue-900 shadow-xs'
                  : 'bg-amber-50/50 border-amber-200 text-amber-900 shadow-xs'
              }`}
            >
              <div>
                {/* Header card bàn */}
                <div className="flex items-center justify-between pb-2 border-b border-black/5">
                  <span className="font-bold text-sm tracking-tight truncate">
                    {item.table.location_name}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.orders.length > 1 && (
                      <span className="px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
                        {item.orders.length} đơn
                      </span>
                    )}
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isEmpty ? 'bg-slate-300' : isServing ? 'bg-blue-500 animate-pulse' : 'bg-amber-500'
                      }`}
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 font-medium mt-1">
                  {item.table.zone || 'Khu vực chính'}
                </p>

                {/* Nội dung trạng thái */}
                <div className="my-3">
                  {isEmpty ? (
                    <div className="py-2 text-center text-xs font-semibold text-slate-400">
                      Bàn trống
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-[11px] text-slate-500">
                          {isServing ? 'Đang phục vụ' : 'Chờ tính tiền'}:
                        </span>
                        <span className={isServing ? 'text-blue-700 font-bold' : 'text-amber-700 font-bold'}>
                          {item.totalItemsCount} món
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-900">
                        {formatCurrency(item.totalAmount)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Chân card */}
              <div className="pt-2 border-t border-black/5 flex items-center justify-between text-[11px] text-slate-400">
                {isEmpty ? (
                  <span>Chưa có khách</span>
                ) : (
                  <span className="flex items-center gap-1 font-medium">
                    <Clock className="w-3 h-3" />
                    <span>
                      {item.openedAt
                        ? new Date(item.openedAt).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </span>
                  </span>
                )}
                <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. Modal Chi tiết bàn */}
      {activeTableItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setActiveTableItem(null)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          />

          <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-100">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  <Utensils className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {activeTableItem.table.location_name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Khu vực: {activeTableItem.table.zone || 'Chung'} •{' '}
                    {activeTableItem.status === 'empty'
                      ? 'Bàn trống'
                      : activeTableItem.status === 'serving'
                      ? `Đang phục vụ (${activeTableItem.orders.length} đơn)`
                      : `Chờ thanh toán (${activeTableItem.orders.length} đơn)`}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTableItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {activeTableItem.status === 'empty' ? (
                <div className="text-center py-10 text-slate-400 space-y-3">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-blue-600 opacity-80" />
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Bàn hiện đang trống</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Khách có thể quét mã QR để bắt đầu gọi món
                    </p>
                  </div>
                  <div className="pt-2">
                    <a
                      href={`/menu/${activeTableItem.table.qr_token}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 shadow-xs transition-all"
                    >
                      <span>Mở Menu gọi món bàn này</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Danh sách món đang gọi ({activeTableItem.totalItemsCount} món)
                    </h4>

                    {activeTableItem.orders.map((order) => (
                      <div
                        key={order.id}
                        className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5"
                      >
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-600 pb-2 border-b border-slate-200/60">
                          <span>Đơn #{order.order_code}</span>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                order.status === 'PREPARING'
                                  ? 'warning'
                                  : order.status === 'PENDING'
                                  ? 'default'
                                  : 'success'
                              }
                            >
                              {order.status === 'PREPARING'
                                ? 'Đang chế biến'
                                : order.status === 'PENDING'
                                ? 'Chờ tiếp nhận'
                                : 'Đã hoàn thành'}
                            </Badge>
                            {order.status !== 'COMPLETED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCompleteSingleOrder(order.id)}
                                className="text-[10px] py-1 px-2 h-auto"
                              >
                                Hoàn thành đơn
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {order.items?.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between text-xs"
                            >
                              <div>
                                <p className="font-semibold text-slate-800">
                                  {item.product_name}{' '}
                                  <span className="text-blue-600 font-bold">x{item.quantity}</span>
                                </p>
                                {item.note && (
                                  <p className="text-[11px] text-amber-600 font-medium">
                                    Ghi chú: {item.note}
                                  </p>
                                )}
                              </div>
                              <span className="font-bold text-slate-800">
                                {formatCurrency(item.subtotal)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {order.note && (
                          <p className="text-xs text-slate-500 italic pt-1 border-t border-slate-200/50">
                            Ghi chú đơn: {order.note}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Tổng tiền */}
                  <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-2xl flex items-center justify-between">
                    <span className="text-sm font-bold text-blue-900">Tổng thanh toán:</span>
                    <span className="text-lg font-black text-blue-700">
                      {formatCurrency(activeTableItem.totalAmount)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            {activeTableItem.status !== 'empty' && (
              <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  onClick={() => handlePrintBill(activeTableItem)}
                  className="flex-1"
                >
                  <Printer className="w-4 h-4 text-slate-500" />
                  <span>In bill tạm tính</span>
                </Button>

                <Button
                  variant="default"
                  onClick={() => handlePaymentTable(activeTableItem)}
                  disabled={isProcessingPayment}
                  className="flex-1"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>
                    {isProcessingPayment
                      ? 'Đang thanh toán...'
                      : activeTableItem.orders.length > 1
                      ? `Thanh toán (${activeTableItem.orders.length} đơn)`
                      : 'Thanh toán & Trả bàn'}
                  </span>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
