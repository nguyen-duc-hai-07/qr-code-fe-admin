import React, { useEffect, useState, useMemo } from 'react';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  XCircle,
  Utensils,
  MapPin,
  Phone,
  RefreshCw,
  Loader2,
  Flame,
  Trash2,
  ArrowLeftRight,
  Plus,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Layers,
  Filter,
} from 'lucide-react';
import { orderApi } from '@/api/order.api';
import { Order, OrderStatus, OrderType } from '@/types/order';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { formatCurrency, formatTimeAgo } from '@/utils/format';
import { Card, CardContent, Badge, Button } from '@/components/ui';
import { ExchangeItemModal } from '@/components/admin/ExchangeItemModal';
import { AddOrderItemModal } from '@/components/admin/AddOrderItemModal';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/utils/error';

export const AdminLiveOrdersPage: React.FC = () => {
  const { showSuccess, showError, showConfirmModal } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState<'ALL' | OrderStatus>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | OrderType>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [selectedDateRange, setSelectedDateRange] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | '7DAYS'>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(9);

  // Modals target
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

  const { subscribe } = useWebSocket();

  const fetchOrders = () => {
    setLoading(true);
    orderApi
      .getAllOrdersAdmin()
      .then((res) => setOrders(res.data || []))
      .catch((err) => console.error('Lỗi tải đơn hàng admin:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // WebSocket real-time updates
  useEffect(() => {
    const unsubscribe = subscribe((payload) => {
      if (payload.action === 'NEW_ORDER' && 'order' in payload) {
        const newOrder = payload.order as Order;
        setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
      } else if (
        (payload.action === 'ORDER_STATUS_UPDATED' || payload.action === 'ORDER_ITEM_REMOVED') &&
        'order' in payload
      ) {
        const updated = payload.order as Order;
        setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      }
    });

    return unsubscribe;
  }, [subscribe]);

  // Actions
  const handleUpdateStatus = async (orderId: number, status: OrderStatus) => {
    try {
      const res = await orderApi.updateOrderStatusAdmin(orderId, { status });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? res.data : o)));
      window.dispatchEvent(new CustomEvent('kitchen_orders_changed'));
      showSuccess('Cập nhật trạng thái đơn thành công!');
    } catch (err: unknown) {
      showError(getErrorMessage(err, 'Cập nhật trạng thái đơn hàng thất bại!'));
    }
  };

  const handleRemoveItem = (orderId: number, itemId: number) => {
    showConfirmModal({
      title: 'Xác nhận xóa món',
      message: 'Bạn có chắc chắn muốn hủy/bớt món này khỏi đơn hàng?',
      description: 'Số tiền và các mục của đơn hàng sẽ được tự động cập nhật.',
      type: 'danger',
      confirmText: 'Xóa món',
      cancelText: 'Hủy bỏ',
      onConfirm: async () => {
        try {
          const res = await orderApi.removeOrderItemAdmin(orderId, itemId);
          setOrders((prev) => prev.map((o) => (o.id === orderId ? res.data : o)));
          showSuccess('Đã hủy món khỏi đơn hàng thành công!');
        } catch (err: unknown) {
          showError(getErrorMessage(err, 'Không thể xóa món khỏi đơn hàng!'));
        }
      },
    });
  };

  // Filter change handlers (auto reset to page 1)
  const handleTabChange = (tab: 'ALL' | OrderStatus) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleTypeChange = (type: 'ALL' | OrderType) => {
    setTypeFilter(type);
    setCurrentPage(1);
  };

  const handleSearchChange = (kw: string) => {
    setSearchKeyword(kw);
    setCurrentPage(1);
  };

  const handleZoneChange = (z: string) => {
    setSelectedZone(z);
    setCurrentPage(1);
  };

  const handleDateRangeChange = (d: 'ALL' | 'TODAY' | 'YESTERDAY' | '7DAYS') => {
    setSelectedDateRange(d);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setActiveTab('ALL');
    setTypeFilter('ALL');
    setSearchKeyword('');
    setSelectedZone('ALL');
    setSelectedDateRange('ALL');
    setCurrentPage(1);
  };

  // Dynamic Zones extracted from orders
  const availableZones = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.zone && o.zone.trim()) {
        set.add(o.zone.trim());
      }
    });
    return Array.from(set).sort();
  }, [orders]);

  // Counts for tabs
  const pendingCount = useMemo(() => orders.filter((o) => o.status === 'PENDING').length, [orders]);
  const preparingCount = useMemo(() => orders.filter((o) => o.status === 'PREPARING').length, [orders]);
  const completedCount = useMemo(() => orders.filter((o) => o.status === 'COMPLETED').length, [orders]);
  const cancelledCount = useMemo(() => orders.filter((o) => o.status === 'CANCELLED').length, [orders]);

  // Filtered Orders List
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const isSameDay = (d1: Date, d2: Date) =>
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    const list = orders.filter((o) => {
      // 1. Status Filter
      const matchStatus = activeTab === 'ALL' ? true : o.status === activeTab;
      // 2. Type Filter
      const matchType = typeFilter === 'ALL' ? true : o.order_type === typeFilter;
      // 3. Zone Filter
      const matchZone = selectedZone === 'ALL' ? true : (o.zone?.trim() === selectedZone);

      // 4. Date Filter
      let matchDate = true;
      if (selectedDateRange !== 'ALL') {
        const orderDate = new Date(o.created_at);
        if (selectedDateRange === 'TODAY') {
          matchDate = isSameDay(orderDate, now);
        } else if (selectedDateRange === 'YESTERDAY') {
          matchDate = isSameDay(orderDate, yesterday);
        } else if (selectedDateRange === '7DAYS') {
          matchDate = orderDate >= sevenDaysAgo;
        }
      }

      // 5. Search Keyword
      let matchSearch = true;
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase().trim();
        const codeMatch = o.order_code?.toLowerCase().includes(kw);
        const tableMatch = o.table_name?.toLowerCase().includes(kw);
        const zoneMatch = o.zone?.toLowerCase().includes(kw);
        const customerMatch = o.customer_name?.toLowerCase().includes(kw);
        const phoneMatch = o.customer_phone?.toLowerCase().includes(kw);
        const addressMatch = o.delivery_address?.toLowerCase().includes(kw);
        const itemsMatch = o.items?.some((i) => i.product_name?.toLowerCase().includes(kw));

        matchSearch = Boolean(
          codeMatch || tableMatch || zoneMatch || customerMatch || phoneMatch || addressMatch || itemsMatch
        );
      }

      return matchStatus && matchType && matchZone && matchDate && matchSearch;
    });

    return [...list].sort((a, b) => {
      const pA = a.status === 'PREPARING' ? 1 : a.status === 'PENDING' ? 2 : a.status === 'COMPLETED' ? 3 : 4;
      const pB = b.status === 'PREPARING' ? 1 : b.status === 'PENDING' ? 2 : b.status === 'COMPLETED' ? 3 : 4;
      if (pA !== pB) {
        return pA - pB;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [orders, activeTab, typeFilter, selectedZone, selectedDateRange, searchKeyword]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedOrders = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, safePage, pageSize]);

  const startIndex = filteredOrders.length > 0 ? (safePage - 1) * pageSize + 1 : 0;
  const endIndex = Math.min(safePage * pageSize, filteredOrders.length);

  const hasActiveFilters = Boolean(
    searchKeyword ||
    selectedZone !== 'ALL' ||
    selectedDateRange !== 'ALL' ||
    typeFilter !== 'ALL' ||
    activeTab !== 'ALL'
  );

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* 1. Header Card */}
      <Card>
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Tất Cả Đơn Hàng & Yêu Cầu
              </h1>
              {preparingCount > 0 && (
                <Badge variant="warning">
                  {preparingCount} đang chế biến
                </Badge>
              )}
              {pendingCount > 0 && (
                <Badge variant="default">
                  {pendingCount} chờ tiếp nhận
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tự động nhận đơn hàng mới và cập nhật trạng thái tức thì qua WebSocket
            </p>
          </div>

          <Button variant="outline" size="sm" onClick={fetchOrders} className="self-start sm:self-auto">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </Button>
        </CardContent>
      </Card>

      {/* 2. Filter & Search Controls */}
      <Card>
        <CardContent className="p-3.5 sm:p-4 space-y-3">
          {/* Top Row: Search Input + Zone Selector + Date Range Selector */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Tìm mã đơn (#ORD...), bàn, tên khách, số điện thoại, món..."
                className="w-full text-xs pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400"
              />
              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Zone Filter */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedZone}
                onChange={(e) => handleZoneChange(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 text-slate-700 font-medium rounded-xl px-2.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="ALL">Tất cả khu vực</option>
                {availableZones.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedDateRange}
                onChange={(e) => handleDateRangeChange(e.target.value as any)}
                className="text-xs bg-slate-50 border border-slate-200 text-slate-700 font-medium rounded-xl px-2.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="ALL">Tất cả thời gian</option>
                <option value="TODAY">Hôm nay</option>
                <option value="YESTERDAY">Hôm qua</option>
                <option value="7DAYS">7 ngày gần đây</option>
              </select>
            </div>

            {/* Clear Filter button if active */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold px-3 py-2 hover:bg-rose-50 rounded-xl transition-colors shrink-0 flex items-center gap-1 cursor-pointer border border-rose-200"
              >
                <X className="w-3.5 h-3.5" />
                <span>Đặt lại</span>
              </button>
            )}
          </div>

          {/* Bottom Row: Status Tabs + Type Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
            {/* Status Tabs with all counts */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {[
                { id: 'ALL', label: `Tất cả (${orders.length})` },
                { id: 'PREPARING', label: `Đang làm (${preparingCount})` },
                { id: 'PENDING', label: `Chờ nhận (${pendingCount})` },
                { id: 'COMPLETED', label: `Hoàn thành (${completedCount})` },
                { id: 'CANCELLED', label: `Đã hủy (${cancelledCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as any)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-xs font-bold'
                      : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl self-start sm:self-auto text-xs shrink-0">
              <button
                type="button"
                onClick={() => handleTypeChange('ALL')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  typeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tất cả loại
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('AT_TABLE')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  typeFilter === 'AT_TABLE' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tại bàn
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('DELIVERY')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  typeFilter === 'DELIVERY' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Giao hàng
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Orders Grid */}
      {loading ? (
        <div className="flex h-72 items-center justify-center bg-white rounded-2xl border border-slate-200/80">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 font-semibold text-slate-600 text-xs">Đang tải danh sách đơn hàng...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 shadow-xs text-slate-400 space-y-3">
          <ClipboardList className="w-12 h-12 mx-auto text-slate-300" />
          <div>
            <p className="text-sm font-bold text-slate-700">Không tìm thấy đơn hàng nào!</p>
            <p className="text-xs text-slate-400 mt-0.5">Thử thay đổi bộ lọc trạng thái, từ khóa tìm kiếm hoặc thời gian.</p>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              Đặt lại tất cả bộ lọc
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {paginatedOrders.map((order) => {
            const isPending = order.status === 'PENDING';
            const isPreparing = order.status === 'PREPARING';
            const isCompleted = order.status === 'COMPLETED';

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl p-4 border transition-all flex flex-col justify-between shadow-xs hover:shadow-md ${
                  isPreparing
                    ? 'border-amber-300 ring-1 ring-amber-300/40 bg-amber-50/10'
                    : isPending
                    ? 'border-blue-200 ring-1 ring-blue-200/40'
                    : 'border-slate-200/80'
                }`}
              >
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div>
                      <span className="text-sm font-bold text-slate-900 tracking-wide">
                        #{order.order_code}
                      </span>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {formatTimeAgo(order.created_at)}
                      </p>
                    </div>

                    <Badge
                      variant={
                        isPreparing
                          ? 'warning'
                          : isPending
                          ? 'default'
                          : isCompleted
                          ? 'success'
                          : 'destructive'
                      }
                    >
                      {isPreparing
                        ? 'Đang chế biến'
                        : isPending
                        ? 'Chờ tiếp nhận'
                        : isCompleted
                        ? 'Đã xong'
                        : 'Đã hủy'}
                    </Badge>
                  </div>

                  {/* Destination / Customer */}
                  <div className="bg-slate-50 p-2.5 rounded-xl space-y-1 text-xs">
                    {order.order_type === 'AT_TABLE' ? (
                      <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                        <Utensils className="w-3.5 h-3.5 text-blue-600" />
                        <span>
                          {order.table_name || 'Bàn ăn'}{order.zone ? ` - ${order.zone}` : ''}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                          <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="truncate">{order.delivery_address || 'Giao tận nơi'}</span>
                        </div>
                        {order.customer_phone && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{order.customer_phone}</span>
                            {order.customer_name && <span>({order.customer_name})</span>}
                          </div>
                        )}
                      </>
                    )}

                    {order.customer_name && order.order_type === 'AT_TABLE' && (
                      <p className="text-[11px] text-slate-500">Khách: {order.customer_name}</p>
                    )}

                    {order.note && (
                      <p className="text-[11px] text-amber-700 bg-amber-50/80 p-1.5 rounded-lg border border-amber-200/60 font-medium">
                        Ghi chú: {order.note}
                      </p>
                    )}
                  </div>

                  {/* Items List */}
                  <div className="divide-y divide-slate-100 max-h-44 overflow-y-auto pr-1">
                    {order.items?.map((item) => (
                      <div key={item.id} className="py-2 flex items-center justify-between text-xs">
                        <div className="min-w-0 pr-2">
                          <span className="font-semibold text-slate-800">
                            {item.quantity}× {item.product_name}
                          </span>
                          {item.note && (
                            <p className="text-[10px] text-slate-400 italic">{item.note}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-slate-800">
                            {formatCurrency(item.subtotal)}
                          </span>
                          {(isPending || order.status === 'PREPARING') && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
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
                                title="Đổi sang món khác cho khách"
                                className="p-1 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                              >
                                <ArrowLeftRight className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(order.id, item.id)}
                                title="Hủy món này"
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {(isPending || order.status === 'PREPARING') && (
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          setAddItemTarget({
                            orderId: order.id,
                            orderCode: order.order_code,
                            tableName: order.table_name,
                            zone: order.zone,
                          })
                        }
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-2.5 py-1 rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                        title="Thêm món mới vào đơn"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Thêm món</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Footer & Actions */}
                <div className="pt-3 border-t border-slate-100 mt-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Tổng tiền:</span>
                    <span className="text-base font-bold text-blue-600">
                      {formatCurrency(order.total_amount)}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    {isPending && (
                      <>
                        <Button
                          variant="warning"
                          size="sm"
                          onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                          className="flex-1 bg-amber-500 hover:bg-amber-600 text-white cursor-pointer"
                        >
                          <Flame className="w-3.5 h-3.5" />
                          <span>Chế biến</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(order.id, 'CANCELLED')}
                          className="text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          Hủy
                        </Button>
                      </>
                    )}

                    {isPreparing && (
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                        className="w-full cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Xong món</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Pagination Bar */}
      {filteredOrders.length > 0 && (
        <Card>
          <CardContent className="p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            {/* Range info */}
            <div className="flex items-center gap-1.5">
              <span>
                Hiển thị <strong className="text-slate-900 font-bold">{startIndex} - {endIndex}</strong> trong tổng số{' '}
                <strong className="text-slate-900 font-bold">{filteredOrders.length}</strong> đơn hàng
              </span>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {/* Page size selector */}
              <div className="flex items-center gap-1.5 mr-2">
                <span className="text-slate-400">Hiển thị:</span>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value={6}>6 đơn/trang</option>
                  <option value={9}>9 đơn/trang</option>
                  <option value={12}>12 đơn/trang</option>
                  <option value={18}>18 đơn/trang</option>
                  <option value={24}>24 đơn/trang</option>
                </select>
              </div>

              {/* Prev button */}
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
                title="Trang trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  if (totalPages <= 7) return true;
                  if (p === 1 || p === totalPages) return true;
                  return Math.abs(p - safePage) <= 1;
                })
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev && p - prev > 1;

                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && <span className="px-1 text-slate-400 font-bold">...</span>}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(p)}
                        className={`min-w-8 h-8 px-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                          safePage === p
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}

              {/* Next button */}
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
                title="Trang kế tiếp"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal Đổi món cho khách */}
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
          onSuccess={fetchOrders}
        />
      )}

      {/* Modal Thêm món vào đơn */}
      {addItemTarget && (
        <AddOrderItemModal
          isOpen={Boolean(addItemTarget)}
          onClose={() => setAddItemTarget(null)}
          orderId={addItemTarget.orderId}
          orderCode={addItemTarget.orderCode}
          tableName={addItemTarget.tableName}
          zone={addItemTarget.zone}
          onSuccess={fetchOrders}
        />
      )}
    </div>
  );
};
