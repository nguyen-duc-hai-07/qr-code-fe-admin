export interface OrderOverviewStatistic {
  from_date: string;
  to_date: string;
  total_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  refunded_orders: number;
  in_progress_orders: number;
  total_revenue: number;
}

export interface OrderTimelineStatistic {
  period: string;
  label: string;
  revenue: number;
  order_count: number;
}
