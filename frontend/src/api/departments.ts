import { api } from './client.js';
import type { Department } from '../types/index.js';

export const departmentsApi = {
  getAll: async (): Promise<Department[]> => {
    const res = await api.get<Department[]>('/departments');
    return res.data;
  },

  getById: async (id: string): Promise<Department> => {
    const res = await api.get<Department>(`/departments/${id}`);
    return res.data;
  },

  create: async (data: { name: string; description?: string }): Promise<Department> => {
    const res = await api.post<Department>('/departments', data);
    return res.data;
  },

  update: async (id: string, data: { name?: string; description?: string }): Promise<Department> => {
    const res = await api.patch<Department>(`/departments/${id}`, data);
    return res.data;
  },
};
