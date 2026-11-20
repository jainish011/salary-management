import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Eye,
  Filter,
  History,
  X,
} from 'lucide-react';
import { auditApi, type AuditLogItem } from '../../api/audit.js';
import { PageHeader } from '../../components/common/PageHeader.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';
import { ErrorMessage } from '../../components/common/ErrorMessage.js';
import { EmptyState } from '../../components/common/EmptyState.js';

const ENTITY_TYPES = [
  'EMPLOYEE',
  'SALARY_STRUCTURE',
  'PAYROLL_PERIOD',
  'PAYSLIP',
  'DEPARTMENT',
  'USER',
];

export const AuditLogsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const {
    data: response,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['audit-logs', page, entityType],
    queryFn: () =>
      auditApi.getAll({
        page,
        limit: 25,
        entityType: entityType || undefined,
      }),
  });

  const logs = response?.data || [];
  const meta = response?.meta;

  const getActionBadge = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'UPDATE':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'DELETE':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'LOCK':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'CALCULATE':
      case 'RUN':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Audit Logs"
        description="Comprehensive immutable audit trail of all employee revisions, salary structure changes, and payroll actions."
      />

      {/* Filter Strip */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Filter Entity:
          </span>
          <select
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Entities</option>
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Total Logged Events: <span className="font-bold text-slate-800">{meta?.total ? meta.total.toLocaleString('en-IN') : 0}</span>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-24 flex justify-center">
            <LoadingSpinner size="lg" label="Loading audit logs..." />
          </div>
        ) : error ? (
          <div className="p-6">
            <ErrorMessage
              title="Error Loading Audit Logs"
              message="Failed to retrieve audit log records."
            />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No Audit Logs Found"
              description="No audit events matched your filter."
            />
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Entity Type</th>
                    <th className="py-3 px-4">Entity ID</th>
                    <th className="py-3 px-4">Performed By</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                        <div className="font-medium text-slate-900">
                          {new Date(log.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-slate-400 font-mono">
                          {new Date(log.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-block text-xs font-bold px-2 py-0.5 rounded border ${getActionBadge(
                            log.action,
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-xs font-semibold text-slate-700">
                        {log.entityType}
                      </td>

                      <td className="py-3 px-4 font-mono text-xs text-slate-500 truncate max-w-[150px]">
                        {log.entityId}
                      </td>

                      <td className="py-3 px-4 text-xs text-slate-700">
                        <div className="font-medium">
                          {log.changer?.fullName || log.changedByName || 'System Auto'}
                        </div>
                        <div className="text-slate-400 truncate max-w-[160px]">
                          {log.changer?.email || 'automated-task'}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        {(log.oldValues || log.newValues) && (
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 p-1 rounded hover:bg-indigo-50 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Diff
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {meta && meta.totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm">
                <span className="text-slate-500 text-xs">
                  Showing {(meta.page - 1) * meta.limit + 1} to{' '}
                  {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} records
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={meta.page <= 1}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 disabled:opacity-50 hover:bg-slate-50"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-slate-600 px-2 font-medium">
                    Page {meta.page} of {meta.totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                    disabled={meta.page >= meta.totalPages}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 disabled:opacity-50 hover:bg-slate-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Diff / JSON Payload Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600" />
                  Audit Event Details
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Action: <span className="font-bold">{selectedLog.action}</span> on{' '}
                  <span className="font-bold">{selectedLog.entityType}</span> (ID: {selectedLog.entityId})
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 text-xs">
              {selectedLog.oldValues && (
                <div>
                  <h4 className="font-bold text-slate-700 uppercase tracking-wider mb-1.5 text-rose-600">
                    Previous State (Old Values)
                  </h4>
                  <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl overflow-x-auto font-mono text-[11px] leading-relaxed">
                    {JSON.stringify(selectedLog.oldValues, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.newValues && (
                <div>
                  <h4 className="font-bold text-slate-700 uppercase tracking-wider mb-1.5 text-indigo-600">
                    Committed State (New Values)
                  </h4>
                  <pre className="p-3 bg-slate-900 text-indigo-300 rounded-xl overflow-x-auto font-mono text-[11px] leading-relaxed">
                    {JSON.stringify(selectedLog.newValues, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end flex-shrink-0">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
