import { api } from './client.js';
import type { Employee, SalaryStructure, Payslip, PaginatedResponse } from '../types/index.js';

export interface EmployeeQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  departmentId?: string;
  status?: string;
  grade?: string;
  workCity?: string;
  workState?: string;
  ctcMin?: number;
  ctcMax?: number;
  sortBy?: string;
  order?: 'ASC' | 'DESC';
}

export const employeesApi = {
  getAll: async (params?: EmployeeQueryParams): Promise<PaginatedResponse<Employee>> => {
    const res = await api.get<PaginatedResponse<Employee>>('/employees', { params });
    return res.data;
  },

  getById: async (id: string): Promise<Employee> => {
    const res = await api.get<Employee>(`/employees/${id}`);
    return res.data;
  },

  create: async (data: any): Promise<Employee> => {
    const res = await api.post<Employee>('/employees', data);
    return res.data;
  },

  update: async (id: string, data: any): Promise<Employee> => {
    const res = await api.patch<Employee>(`/employees/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<Employee> => {
    const res = await api.delete<Employee>(`/employees/${id}`);
    return res.data;
  },

  getSalaryHistory: async (id: string): Promise<SalaryStructure[]> => {
    const res = await api.get<SalaryStructure[]>(`/employees/${id}/salary-history`);
    return res.data;
  },

  getPayslips: async (id: string, page = 1, limit = 10): Promise<PaginatedResponse<Payslip>> => {
    const res = await api.get<PaginatedResponse<Payslip>>(`/employees/${id}/payslips`, {
      params: { page, limit },
    });
    return res.data;
  },

  createSalaryRevision: async (data: {
    employeeId: string;
    annualCtc: number;
    effectiveFrom: string;
    revisionReason: string;
    remarks?: string;
  }): Promise<SalaryStructure> => {
    const res = await api.post<SalaryStructure>('/salary-structures', data);
    return res.data;
  },
};
