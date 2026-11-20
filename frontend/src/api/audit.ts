import { api } from './client.js';
import type { PaginatedResponse } from '../types/index.js';

export interface AuditLogItem {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValues: Record<string, any> | null;
  newValues: Record<string, any> | null;
  changedBy: string | null;
  changedByName: string | null;
  changer?: { fullName: string; email: string };
  ipAddress: string | null;
  createdAt: string;
}

export const auditApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    entityType?: string;
    entityId?: string;
    from?: string;
    to?: string;
  }): Promise<PaginatedResponse<AuditLogItem>> => {
    const res = await api.get<PaginatedResponse<AuditLogItem>>('/audit-logs', { params });
    return res.data;
  },
};
