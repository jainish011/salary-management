import { api, getAuthToken } from './client.js';

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
    const token = getAuthToken();
    return token
      ? `/api/v1/reports/export?token=${encodeURIComponent(token)}`
      : '/api/v1/reports/export';
  },

  downloadEmployeesCsv: async () => {
    const res = await api.get('/reports/export', { responseType: 'blob' });
    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `employees-salary-report-${new Date().toISOString().split('T')[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
