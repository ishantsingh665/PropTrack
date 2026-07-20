import api from './client';

export interface AuditLogEntry {
  id: string;
  tableName: string;
  recordId: string;
  action: 'create' | 'update' | 'delete';
  changes: any;
  changedAt: string;
  userId: string;
  user: {
    name: string;
    email: string;
  } | null;
}

export interface AuditLogFilters {
  after?: string;
  limit?: number;
  tableName?: string;
  recordId?: string;
  userId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const getAuditLogs = async (params: AuditLogFilters) => {
  const response = await api.get('/audit', { params });
  return response.data;
};
