import { api } from './client.js';

export const reportsApi = {
  getDashboard: async () => {
    const res = await api.get('/reports/dashboard');
    return res.data;
  },

  getDepartmentSummary: async () => {
    const res = await api.get('/reports/department-summary');
    return res.data;
  },

  getSalaryDistribution: async () => {
    const res = await api.get('/reports/salary-distribution');
    return res.data;
  },

  getPayrollTrend: async (months = 6) => {
    const res = await api.get('/reports/payroll-trend', { params: { months } });
    return res.data;
  },

  getGradeSummary: async () => {
    const res = await api.get('/reports/grade-summary');
    return res.data;
  },

  getHeadcountByCity: async () => {
    const res = await api.get('/reports/headcount-by-city');
    return res.data;
  },

  getExportCsvUrl: () => {
    return '/api/v1/reports/export';
  },
};
