import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  FileText,
  Loader2,
  Lock,
  Play,
  Search,
} from 'lucide-react';
import { payrollApi } from '../../api/payroll.js';
import { departmentsApi } from '../../api/departments.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { InrAmount } from '../../components/common/InrAmount.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';
import { ErrorMessage } from '../../components/common/ErrorMessage.js';
import { EmptyState } from '../../components/common/EmptyState.js';

export const PayrollDetailPage: React.FC = () => {
  const { periodId } = useParams<{ periodId: string }>();
  const queryClient = useQueryClient();

  // Search & Filter state
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [showLockModal, setShowLockModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch Period
  const {
    data: period,
    isLoading: isPeriodLoading,
    error: periodError,
    refetch: refetchPeriod,
  } = useQuery({
    queryKey: ['payroll-period', periodId],
    queryFn: () => payrollApi.getPeriodById(periodId!),
    enabled: !!periodId,
  });

  // Fetch Departments for filter
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.getAll(),
  });

  // Fetch Payslips for this period
  const {
    data: payslipsResponse,
    isLoading: isPayslipsLoading,
    refetch: refetchPayslips,
  } = useQuery({
    queryKey: ['payroll-payslips', periodId, page, searchTerm, departmentId],
    queryFn: () =>
      payrollApi.getPeriodPayslips(periodId!, {
        page,
        limit: 20,
        search: searchTerm.trim() || undefined,
        departmentId: departmentId || undefined,
      }),
    enabled: !!periodId,
  });

  // Run Payroll Mutation
  const runMutation = useMutation({
    mutationFn: () => payrollApi.runPayroll(periodId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-period', periodId] });
      queryClient.invalidateQueries({ queryKey: ['payroll-payslips', periodId] });
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      refetchPeriod();
      refetchPayslips();
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(
        err.response?.data?.message || err.message || 'Failed to execute payroll run',
      );
    },
  });

  // Lock Payroll Mutation
  const lockMutation = useMutation({
    mutationFn: () => payrollApi.lockPayroll(periodId!),
    onSuccess: () => {
      setShowLockModal(false);
      queryClient.invalidateQueries({ queryKey: ['payroll-period', periodId] });
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
      refetchPeriod();
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(
        err.response?.data?.message || err.message || 'Failed to lock payroll period',
      );
    },
  });

  if (isPeriodLoading) {
    return (
      <div className="py-24 flex justify-center">
        <LoadingSpinner size="lg" label="Loading payroll cycle details..." />
      </div>
    );
  }

  if (periodError || !period) {
    return (
      <div className="space-y-4">
        <Link
          to="/payroll"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Payroll Periods
        </Link>
        <ErrorMessage
          title="Payroll Period Not Found"
          message="Could not load the requested payroll period."
        />
      </div>
    );
  }

  const isLocked = period.status === 'LOCKED';
  const hasBeenRun = Boolean(period.runAt) || (period.totalEmployees != null && period.totalEmployees > 0);
  const isProcessing = period.status === 'PROCESSING' || (!isLocked && hasBeenRun);
  const isOpen = period.status === 'OPEN' && !hasBeenRun;
  const payslips = payslipsResponse?.data || [];
  const meta = payslipsResponse?.meta;

  const totalDeductionsSum =
    (period.totalGross || 0) - (period.totalNet || 0);

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/payroll"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Payroll Cycles
        </Link>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {isOpen && (
            <button
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-xs hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {runMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Computing Payroll...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Execute Batch Payroll Run
                </>
              )}
            </button>
          )}

          {isProcessing && (
            <button
              onClick={() => setShowLockModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-lg shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              Lock & Finalize Period
            </button>
          )}

          {isLocked && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-300 rounded-lg">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              Locked & Audit-Sealed
            </div>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          {actionError}
        </div>
      )}

      {/* Hero Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{period.periodName}</h1>
              <StatusBadge status={period.status} />
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                FY {period.fiscalYear}
              </span>
            </div>
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>
                {new Date(period.startDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}{' '}
                —{' '}
                {new Date(period.endDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
              {period.payDate && (
                <>
                  <span className="text-slate-300">•</span>
                  <span>Pay Date: {new Date(period.payDate).toLocaleDateString('en-IN')}</span>
                </>
              )}
            </p>
          </div>

          {period.runAt && (
            <div className="text-right text-xs text-slate-500">
              <div>
                Last Run:{' '}
                <span className="font-semibold text-slate-700">
                  {new Date(period.runAt).toLocaleString('en-IN')}
                </span>
              </div>
              {period.lockedAt && (
                <div>
                  Locked:{' '}
                  <span className="font-semibold text-slate-700">
                    {new Date(period.lockedAt).toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Headcount
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {period.totalEmployees ? period.totalEmployees.toLocaleString('en-IN') : '0'}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Eligible Active Employees</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Gross Payroll
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            <InrAmount amount={period.totalGross} />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Total Employee Earnings</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Deductions
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-1">
            <InrAmount amount={totalDeductionsSum > 0 ? totalDeductionsSum : 0} />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">PF, PT, TDS & Withholdings</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Net Disbursed
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            <InrAmount amount={period.totalNet} />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Total In-Hand Salary Payout</p>
        </div>
      </div>

      {/* Payslips Section with Filters & Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-900">
              Employee Payslips ({meta?.total ? meta.total.toLocaleString('en-IN') : 0})
            </h2>
          </div>

          {/* Search & Department Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search name or emp code..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            <select
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Payslips Table */}
        {isPayslipsLoading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner size="lg" label="Loading employee payslips..." />
          </div>
        ) : payslips.length === 0 ? (
          <div className="p-12 text-center">
            {isOpen ? (
              <EmptyState
                title="Payroll Run Not Executed"
                description="This payroll period is currently OPEN. Click 'Execute Batch Payroll Run' above to compute payslips for all active employees."
                action={
                  <button
                    onClick={() => runMutation.mutate()}
                    className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                  >
                    Execute Batch Payroll Run
                  </button>
                }
              />
            ) : (
              <EmptyState
                title="No Payslips Found"
                description="No payslips match your search or filter criteria."
              />
            )}
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4 text-right">Gross Earnings</th>
                    <th className="py-3 px-4 text-right">PF</th>
                    <th className="py-3 px-4 text-right">PT</th>
                    <th className="py-3 px-4 text-right">TDS</th>
                    <th className="py-3 px-4 text-right font-bold text-emerald-800">Net Pay</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payslips.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900">
                          {p.employee?.firstName} {p.employee?.lastName}
                        </div>
                        <div className="font-mono text-xs text-slate-500">
                          {p.employee?.employeeCode}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {p.employee?.department?.name || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-900 font-medium">
                        <InrAmount amount={p.grossEarnings} />
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-600">
                        <InrAmount amount={p.employeePf} />
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-600">
                        <InrAmount amount={p.professionalTax} />
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-600">
                        <InrAmount amount={p.tds} />
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                        <InrAmount amount={p.netPay} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/payslip/${p.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          View Payslip →
                        </Link>
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
                  {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} payslips
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

      {/* Lock Confirmation Modal */}
      {showLockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Lock className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Lock & Finalize Payroll</h3>
            </div>
            <p className="text-sm text-slate-600">
              Are you sure you want to lock the payroll period{' '}
              <strong className="text-slate-900">{period.periodName}</strong>? Once locked, all{' '}
              <span className="font-semibold text-slate-900">
                {period.totalEmployees?.toLocaleString('en-IN')}
              </span>{' '}
              payslips will be sealed for disbursement and audit compliance. No recalculations can
              be performed on locked cycles.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLockModal(false)}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                disabled={lockMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => lockMutation.mutate()}
                className="px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={lockMutation.isPending}
              >
                {lockMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Locking Period...</span>
                  </>
                ) : (
                  'Confirm & Lock Period'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
