import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  DollarSign,
  FileSpreadsheet,
  Loader2,
  Plus,
  Users,
  X,
} from 'lucide-react';
import { payrollApi } from '../../api/payroll.js';
import { PageHeader } from '../../components/common/PageHeader.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { InrAmount } from '../../components/common/InrAmount.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';
import { ErrorMessage } from '../../components/common/ErrorMessage.js';
import { EmptyState } from '../../components/common/EmptyState.js';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const PayrollListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [page] = useState(1);

  // Form State for New Period Modal
  const now = new Date();
  const [newMonth, setNewMonth] = useState<number>(now.getMonth() + 1);
  const [newYear, setNewYear] = useState<number>(now.getFullYear());
  const [formError, setFormError] = useState<string | null>(null);

  // Compute first and last date of month
  const pad = (n: number) => n.toString().padStart(2, '0');
  const lastDayNumber = new Date(Date.UTC(newYear, newMonth, 0)).getUTCDate();
  const computedStartDate = `${newYear}-${pad(newMonth)}-01`;
  const computedEndDate = `${newYear}-${pad(newMonth)}-${pad(lastDayNumber)}`;
  const computedPayDate = `${newYear}-${pad(newMonth)}-${pad(lastDayNumber)}`;

  const handleOpenModal = () => {
    setShowModal(true);
    setFormError(null);
  };

  // Fetch Periods
  const {
    data: response,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['payroll-periods', page],
    queryFn: () => payrollApi.getPeriods(page, 20),
  });

  // Create Period Mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => payrollApi.createPeriod(data),
    onSuccess: (newPeriod) => {
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
      navigate(`/payroll/${newPeriod.id}`);
    },
    onError: (err: any) => {
      setFormError(
        err.response?.data?.message || err.message || 'Failed to create period',
      );
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation: prevent duplicate period
    const exists = periods.some(
      (p) => Number(p.month) === Number(newMonth) && Number(p.year) === Number(newYear),
    );
    if (exists) {
      setFormError(
        `A payroll cycle for ${MONTH_NAMES[newMonth - 1]} ${newYear} already exists.`,
      );
      return;
    }

    createMutation.mutate({
      month: Number(newMonth),
      year: Number(newYear),
      startDate: computedStartDate,
      endDate: computedEndDate,
      payDate: computedPayDate,
    });
  };

  const periods = response?.data || [];

  // Calculate Quick Summaries
  const totalEmployeesInAll = periods.reduce((acc, p) => acc + (p.totalEmployees || 0), 0);
  const totalNetDisbursed = periods.reduce((acc, p) => acc + (Number(p.totalNet) || 0), 0);
  const lockedCount = periods.filter((p) => p.status === 'LOCKED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Payroll Periods"
        description="Manage statutory payroll cycles, execute batch calculations, and disburse payslips."
      >
        <button
          onClick={handleOpenModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-xs hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Open New Period
        </button>
      </PageHeader>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Cycles
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              {periods.length}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {lockedCount} Locked & Disbursed
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Disbursed (Visible Cycles)
            </div>
            <div className="text-2xl font-bold text-emerald-700 mt-0.5">
              <InrAmount amount={totalNetDisbursed} compact />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Cumulative Net Pay</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Payslips Processed
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              {totalEmployeesInAll.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Across recorded runs</p>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-24 flex justify-center">
            <LoadingSpinner size="lg" label="Loading payroll periods..." />
          </div>
        ) : error ? (
          <div className="p-6">
            <ErrorMessage
              title="Error Loading Payroll"
              message="Failed to fetch payroll cycles from the server."
            />
          </div>
        ) : periods.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No Payroll Periods Found"
              description="Open a new payroll period to begin computing monthly salaries."
              action={
                <button
                  onClick={handleOpenModal}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  + Open First Period
                </button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Fiscal Year</th>
                  <th className="py-3 px-4">Date Range</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Headcount</th>
                  <th className="py-3 px-4">Gross Payout</th>
                  <th className="py-3 px-4">Net Payout</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {periods.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/payroll/${p.id}`)}
                    className="hover:bg-slate-50/75 cursor-pointer transition-colors"
                  >
                    <td className="py-4 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      <span>{p.periodName}</span>
                    </td>
                    <td className="py-4 px-4 text-slate-600 font-medium">
                      FY {p.fiscalYear}
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-500">
                      {new Date(p.startDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}{' '}
                      —{' '}
                      {new Date(p.endDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="py-4 px-4 text-slate-900 font-medium">
                      {p.totalEmployees ? p.totalEmployees.toLocaleString('en-IN') : '—'}
                    </td>
                    <td className="py-4 px-4 text-slate-700">
                      <InrAmount amount={p.totalGross} />
                    </td>
                    <td className="py-4 px-4 font-bold text-emerald-700">
                      <InrAmount amount={p.totalNet} />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Link
                        to={`/payroll/${p.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        View Details →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Open New Payroll Period */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                Open New Payroll Period
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Month
                  </label>
                  <select
                    value={newMonth}
                    onChange={(e) => {
                      setNewMonth(Number(e.target.value));
                      setFormError(null);
                    }}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    {MONTH_NAMES.map((name, index) => (
                      <option key={name} value={index + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Year
                  </label>
                  <input
                    type="number"
                    min={2020}
                    max={2035}
                    value={newYear}
                    onChange={(e) => {
                      setNewYear(Number(e.target.value));
                      setFormError(null);
                    }}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Automatic Period Dates Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Period Duration:</span>
                  <span className="font-semibold text-slate-800">
                    01 {MONTH_NAMES[newMonth - 1]} {newYear} – {lastDayNumber} {MONTH_NAMES[newMonth - 1]} {newYear}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Scheduled Pay Date:</span>
                  <span className="font-semibold text-emerald-700">
                    {lastDayNumber} {MONTH_NAMES[newMonth - 1]} {newYear} (Month-End)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-200/60">
                  Dates are automatically computed for the full calendar month according to standard statutory cycle rules.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-xs hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Opening Period...</span>
                    </>
                  ) : (
                    'Open Period'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
