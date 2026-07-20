import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  ChevronRight, 
  User, 
  Calendar, 
  Clock, 
  Activity,
  Database,
  ArrowRight,
  Download
} from 'lucide-react';
import { getAuditLogs, AuditLogEntry, AuditLogFilters } from '../api/audit';
import { getUsers, User as SystemUser } from '../api/users';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

const AuditLog: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState({ after: null as string | null, limit: 50 });
  const [filters, setFilters] = useState<AuditLogFilters>({
    tableName: '',
    action: '',
    userId: '',
    dateFrom: '',
    dateTo: '',
  });

  const fetchInitialData = useCallback(async () => {
    try {
      const usersData = await getUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  }, []);

  const fetchLogs = useCallback(async (after?: string) => {
    setIsLoading(true);
    try {
      const { data, pagination: pag } = await getAuditLogs({ 
        ...filters, 
        after, 
        limit: 50 
      });
      setLogs(data);
      setPagination(pag);
    } catch (error: any) {
      console.error('Failed to fetch audit logs:', error);
      if (error.response?.status === 403) {
        alert('Access denied. Admin role required.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExportCSV = () => {
    if (logs.length === 0) return;

    const headers = ['Timestamp', 'User', 'Action', 'Entity', 'Record ID', 'Changes'];
    const rows = logs.map(log => [
      format(new Date(log.changedAt), 'yyyy-MM-dd HH:mm:ss'),
      log.user?.email || 'System',
      log.action,
      log.tableName,
      log.recordId,
      JSON.stringify(log.changes || {}).replace(/"/g, '""')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `proptrack_audit_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadge = (action: string) => {
    switch (action.toUpperCase()) {
      case 'INSERT': return 'bg-green-100 text-green-700 border-green-200';
      case 'UPDATE': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'DELETE': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6 text-black">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-1">System-wide change tracking for compliance and data integrity.</p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={logs.length === 0}
          className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
        >
          <Download className="w-4 h-4 mr-2 text-blue-600" />
          Export CSV
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="md:col-span-1">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Entity</label>
          <select 
            className="w-full text-xs font-bold border-gray-200 rounded-lg focus:ring-blue-500 text-black py-2"
            value={filters.tableName || ''}
            onChange={(e) => setFilters({ ...filters, tableName: e.target.value })}
          >
            <option value="">All Entities</option>
            <option value="properties">Properties</option>
            <option value="companies">Companies</option>
            <option value="property_companies">Ownership Stakes</option>
            <option value="property_transfers">Transfers</option>
            <option value="duplicate_pairs">Duplicate Resolution</option>
            <option value="company_notes">Notes</option>
          </select>
        </div>
        <div className="md:col-span-1">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Action</label>
          <select 
            className="w-full text-xs font-bold border-gray-200 rounded-lg focus:ring-blue-500 text-black py-2"
            value={filters.action || ''}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
          >
            <option value="">All Actions</option>
            <option value="INSERT">Create (INSERT)</option>
            <option value="UPDATE">Edit (UPDATE)</option>
            <option value="DELETE">Remove (DELETE)</option>
          </select>
        </div>
        <div className="md:col-span-1">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Performed By</label>
          <select 
            className="w-full text-xs font-bold border-gray-200 rounded-lg focus:ring-blue-500 text-black py-2"
            value={filters.userId || ''}
            onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
          >
            <option value="">All Users</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div className="md:col-span-1">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">From Date</label>
          <input 
            type="date"
            className="w-full text-xs font-bold border-gray-200 rounded-lg focus:ring-blue-500 text-black py-1.5"
            value={filters.dateFrom || ''}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
          />
        </div>
        <div className="md:col-span-1">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">To Date</label>
          <input 
            type="date"
            className="w-full text-xs font-bold border-gray-200 rounded-lg focus:ring-blue-500 text-black py-1.5"
            value={filters.dateTo || ''}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
          />
        </div>
        <div className="md:col-span-1">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Record ID</label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
            <input 
              type="text"
              placeholder="UUID..."
              className="w-full pl-7 text-xs font-bold border-gray-200 rounded-lg focus:ring-blue-500 text-black py-1.5"
              value={filters.recordId || ''}
              onChange={(e) => setFilters({ ...filters, recordId: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 font-bold border-b border-gray-100">
                <th className="px-6 py-4">Timestamp & User</th>
                <th className="px-6 py-4">Action & Entity</th>
                <th className="px-6 py-4">Changes (Diff)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4 align-top w-64">
                    <div className="flex items-center text-sm font-medium text-gray-900">
                      <Clock className="w-4 h-4 mr-2 text-gray-400" />
                      {format(new Date(log.changedAt), 'MMM d, HH:mm:ss')}
                    </div>
                    <div className="flex items-center text-xs text-gray-500 mt-2">
                      <div className="w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center mr-2 text-[10px] font-bold">
                        {(log.user?.name || 'S').charAt(0)}
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-gray-700">{log.user?.name || 'System'}</div>
                        <div className="text-[10px] text-gray-400">{log.user?.email || 'automated-task@proptrack.local'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top w-64">
                    <div className="flex items-center space-x-2">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider",
                        getActionBadge(log.action)
                      )}>
                        {log.action}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center text-[10px] font-bold text-gray-500 uppercase">
                      <Database className="w-3.5 h-3.5 mr-2 text-gray-400" />
                      <span className="text-gray-700 tracking-tight">{log.tableName}</span>
                    </div>
                    <div className="mt-1 text-[10px] text-gray-400 font-mono truncate max-w-[150px]" title={log.recordId}>
                      ID: {log.recordId.substring(0, 8)}...
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    {log.changes && Object.keys(log.changes).length > 0 ? (
                      <div className="space-y-3">
                        {Object.entries(log.changes).map(([field, delta]: [string, any]) => (
                          <div key={field} className="text-xs">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{field}</div>
                            <div className="flex items-center bg-gray-50 rounded-lg p-2 border border-gray-100">
                              <div className="flex-1 min-w-0">
                                <div className="text-[9px] text-gray-400 uppercase font-black mb-0.5">Before</div>
                                <div className="text-gray-500 truncate italic">
                                  {delta.from === null || delta.from === undefined ? 'NULL' : String(delta.from)}
                                </div>
                              </div>
                              <ArrowRight className="w-4 h-4 text-gray-300 mx-3 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-[9px] text-blue-400 uppercase font-black mb-0.5">After</div>
                                <div className="text-blue-700 font-bold truncate">
                                  {delta.to === null || delta.to === undefined ? 'NULL' : String(delta.to)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">No detailed changes recorded for this action.</span>
                    )}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                    No audit records found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Showing {logs.length} audit entries
          </p>
          <div className="flex items-center space-x-2">
            <button
              disabled={isLoading || !pagination.after}
              onClick={() => fetchLogs(pagination.after || undefined)}
              className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLog;

