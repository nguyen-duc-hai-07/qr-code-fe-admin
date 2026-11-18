import { apiClient } from './client';
import { ResponseGeneral } from '@/types/api';
import { OrderOverviewStatistic, OrderTimelineStatistic } from '@/types/statistic';

export const statisticApi = {
  getOverview: async (fromDate?: string, toDate?: string): Promise<ResponseGeneral<OrderOverviewStatistic>> => {
    const res = await apiClient.get<ResponseGeneral<OrderOverviewStatistic>>('/api/v1/statistics/overview', {
      params: {
        from_date: fromDate,
        to_date: toDate,
      },
    });
    return res.data;
  },

  getMonthlyChart: async (year?: number): Promise<ResponseGeneral<OrderTimelineStatistic[]>> => {
    const res = await apiClient.get<ResponseGeneral<OrderTimelineStatistic[]>>('/api/v1/statistics/chart/monthly', {
      params: { year },
    });
    return res.data;
  },

  getYearlyChart: async (startYear?: number, endYear?: number): Promise<ResponseGeneral<OrderTimelineStatistic[]>> => {
    const res = await apiClient.get<ResponseGeneral<OrderTimelineStatistic[]>>('/api/v1/statistics/chart/yearly', {
      params: {
        start_year: startYear,
        end_year: endYear,
      },
    });
    return res.data;
  },
};
