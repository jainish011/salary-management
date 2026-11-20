import { api } from './client.js';
import type { PayrollPeriod, Payslip, PaginatedResponse } from '../types/index.js';

export const payrollApi = {
  getPeriods: async (page = 1, limit = 20): Promise<PaginatedResponse<PayrollPeriod>> => {
    const res = await api.get<PaginatedResponse<PayrollPeriod>>('/payroll-periods', {
      params: { page, limit },
    });
    return res.data;
  },

  getPeriodById: async (id: string): Promise<PayrollPeriod> => {
    const res = await api.get<PayrollPeriod>(`/payroll-periods/${id}`);
    return res.data;
  },

  createPeriod: async (data: {
    month: number;
    year: number;
    startDate: string;
    endDate: string;
    payDate?: string;
  }): Promise<PayrollPeriod> => {
    const res = await api.post<PayrollPeriod>('/payroll-periods', data);
    return res.data;
  },

  runPayroll: async (periodId: string) => {
    const res = await api.post(`/payroll-periods/${periodId}/run`);
    return res.data;
  },

  lockPayroll: async (periodId: string): Promise<PayrollPeriod> => {
    const res = await api.post<PayrollPeriod>(`/payroll-periods/${periodId}/lock`);
    return res.data;
  },

  getPeriodPayslips: async (
    periodId: string,
    params?: { page?: number; limit?: number; search?: string; departmentId?: string },
  ): Promise<PaginatedResponse<Payslip>> => {
    const res = await api.get<PaginatedResponse<Payslip>>(`/payroll-periods/${periodId}/payslips`, {
      params,
    });
    return res.data;
  },

  getPayslipById: async (id: string): Promise<Payslip> => {
    const res = await api.get<Payslip>(`/payslips/${id}`);
    return res.data;
  },
};
