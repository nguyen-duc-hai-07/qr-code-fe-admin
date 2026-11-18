import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  CheckCircle2,
  XCircle,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { statisticApi } from '@/api/statistic.api';
import { OrderOverviewStatistic, OrderTimelineStatistic } from '@/types/statistic';
import { formatCurrency } from '@/utils/format';
import { Card, CardContent, Button } from '@/components/ui';

export const AdminAnalyticsPage: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // Date range filters for overview KPI
  const [dateRangeMode, setDateRangeMode] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [overview, setOverview] = useState<OrderOverviewStatistic | null>(null);
  const [monthlyData, setMonthlyData] = useState<OrderTimelineStatistic[]>([]);
  const [loading, setLoading] = useState(true);

  // Compute fromDate & toDate strings based on dateRangeMode
  const { fromDateStr, toDateStr } = useMemo(() => {
    const now = new Date();
    const to = now.toISOString().split('T')[0];
    let from = '';

    if (dateRangeMode === 'today') {
      from = to;
    } else if (dateRangeMode === 'week') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      from = d.toISOString().split('T')[0];
    } else if (dateRangeMode === 'month') {
      from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    } else if (dateRangeMode === 'year') {
      from = `${now.getFullYear()}-01-01`;
    }
    return { fromDateStr: from, toDateStr: to };
  }, [dateRangeMode]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [overRes, monthRes] = await Promise.all([
        statisticApi.getOverview(fromDateStr, toDateStr),
        statisticApi.getMonthlyChart(selectedYear),
      ]);
      setOverview(overRes.data);
      setMonthlyData(monthRes.data || []);
    } catch (err) {
      console.error('Failed to load statistics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [fromDateStr, toDateStr, selectedYear]);

  // Max revenue for bar chart scaling
  const maxMonthlyRevenue = useMemo(() => {
    const max = Math.max(...monthlyData.map((d) => Number(d.revenue || 0)), 0);
    return max > 0 ? max : 1000000;
  }, [monthlyData]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* 1. Top Header Card */}
      <Card>
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Thống Kê Doanh Thu & Báo Cáo
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Báo cáo hiệu suất kinh doanh, đơn hoàn tất và biểu đồ tăng trưởng
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Quick Date Range Buttons */}
            <div className="bg-slate-100 p-0.5 rounded-xl flex items-center gap-0.5 text-xs font-semibold">
              <button
                onClick={() => setDateRangeMode('today')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  dateRangeMode === 'today'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Hôm nay
              </button>
              <button
                onClick={() => setDateRangeMode('week')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  dateRangeMode === 'week'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                7 ngày
              </button>
              <button
                onClick={() => setDateRangeMode('month')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  dateRangeMode === 'month'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Tháng này
              </button>
              <button
                onClick={() => setDateRangeMode('year')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  dateRangeMode === 'year'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Cả năm
              </button>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={loadData}
              title="Tải lại số liệu"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Doanh thu thuần */}
        <Card className="hover:border-blue-200 transition">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Doanh Thu Thuần</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl font-bold text-blue-600">
                {formatCurrency(overview?.total_revenue || 0)}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Từ các đơn đã hoàn tất thanh toán
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 2. Tổng số đơn */}
        <Card className="hover:border-slate-300 transition">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Tổng Đơn Hàng</span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl font-bold text-slate-900">
                {overview?.total_orders || 0}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Toàn bộ đơn trong khoảng thời gian
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 3. Đã hoàn tất */}
        <Card className="hover:border-blue-300 transition">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Đã Hoàn Tất</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl font-bold text-blue-600">
                {overview?.completed_orders || 0}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Đã phục vụ & thanh toán thành công
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 4. Đã hủy */}
        <Card className="hover:border-rose-300 transition">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Đã Hủy</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl font-bold text-rose-600">
                {overview?.cancelled_orders || 0}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Đơn khách hủy hoặc từ chối phục vụ
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Monthly Chart */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Biểu Đồ Doanh Thu 12 Tháng Trong Năm {selectedYear}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Dữ liệu tự động thống kê 12 tháng liên tục
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Chọn năm:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                  <option key={y} value={y}>
                    Năm {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Visual Bar Chart */}
          <div className="pt-6 pb-2">
            <div className="grid grid-cols-12 gap-2 h-64 items-end border-b border-slate-100 pb-2">
              {monthlyData.map((item, idx) => {
                const heightPercent =
                  maxMonthlyRevenue > 0
                    ? Math.min(100, Math.round((Number(item.revenue || 0) / maxMonthlyRevenue) * 100))
                    : 0;

                return (
                  <div key={idx} className="flex flex-col items-center h-full justify-end group relative">
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-20 bg-slate-900 text-white text-[10px] py-1 px-2.5 rounded-lg pointer-events-none whitespace-nowrap shadow-xl">
                      <p className="font-bold">{item.label}</p>
                      <p className="text-blue-300 font-semibold">{formatCurrency(item.revenue)}</p>
                      <p className="text-slate-300">{item.order_count} đơn</p>
                    </div>

                    {/* Top value badge if revenue > 0 */}
                    {Number(item.revenue) > 0 && (
                      <span className="text-[10px] font-bold text-blue-600 mb-1 hidden sm:block truncate">
                        {Math.round(Number(item.revenue) / 1000)}k
                      </span>
                    )}

                    {/* The bar */}
                    <div
                      style={{ height: `${Math.max(4, heightPercent)}%` }}
                      className={`w-full max-w-[36px] rounded-t-xl transition-all duration-300 ${
                        Number(item.revenue) > 0
                          ? 'bg-blue-600 hover:bg-blue-700 shadow-2xs'
                          : 'bg-slate-100'
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            {/* Month Labels below bars */}
            <div className="grid grid-cols-12 gap-2 pt-2 text-center text-[11px] font-semibold text-slate-500">
              {monthlyData.map((_, idx) => (
                <div key={idx} className="truncate">
                  T{idx + 1}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
