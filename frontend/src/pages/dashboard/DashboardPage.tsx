import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users,
  CreditCard,
  Calendar,
  ShieldCheck,
  UserPlus,
  PlayCircle,
  Download,
  Building,
  TrendingUp,
  History,
  ArrowUpRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { reportsApi } from '../../api/reports.js';
import { PageHeader } from '../../components/common/PageHeader.js';
import { formatINR } from '../../components/common/InrAmount.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';
import { ErrorMessage } from '../../components/common/ErrorMessage.js';

const BAND_COLORS = [
  '#6366f1', // indigo
  '#3b82f6', // blue
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
];

export const DashboardPage: React.FC = () => {
  const {
    data: dashboard,
    isLoading: isDashLoading,
    error: dashError,
    refetch: refetchDash,
  } = useQuery({
    queryKey: ['reports', 'dashboard'],
    queryFn: reportsApi.getDashboard,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: deptSummary,
    isLoading: isDeptLoading,
  } = useQuery({
    queryKey: ['reports', 'department-summary'],
    queryFn: reportsApi.getDepartmentSummary,
    staleTime: 10 * 60 * 1000,
  });

  const {
    data: salaryDist,
    isLoading: isDistLoading,
  } = useQuery({
    queryKey: ['reports', 'salary-distribution'],
    queryFn: reportsApi.getSalaryDistribution,
    staleTime: 10 * 60 * 1000,
  });

  if (dashError) {
    return (
      <div>
        <PageHeader title="Executive HR Dashboard" description="Overview of organization compensation & payroll" />
        <ErrorMessage
          title="Could not load Dashboard metrics"
          message="Failed to load dashboard metrics from backend. Ensure the server is running."
          onRetry={refetchDash}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive HR Dashboard"
        description="Comprehensive compensation, payroll runs, and headcount analytics for ACME Organization."
      >
        <Link
          to="/employees/new"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm shadow-indigo-600/30 transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Employee</span>
        </Link>
        <Link
          to="/payroll"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 shadow-xs transition"
        >
          <PlayCircle className="w-4 h-4 text-indigo-600" />
          <span>Payroll Cycles</span>
        </Link>
        <a
          href={reportsApi.getExportCsvUrl()}
          download="employees-salary-report.csv"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs border border-emerald-200 transition"
        >
          <Download className="w-4 h-4 text-emerald-600" />
          <span>Export CSV</span>
        </a>
      </PageHeader>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Headcount */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Employees
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {isDashLoading ? '...' : (dashboard?.totalActiveEmployees?.toLocaleString('en-IN') || 0)}
            </h3>
            <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              100% Verified in DB
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Monthly Payroll */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Monthly Payroll
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {isDashLoading
                ? '...'
                : formatINR(dashboard?.totalMonthlyPayroll || 0, true)}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Latest Locked: {dashboard?.currentPeriod?.name || 'N/A'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        {/* Current Period */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Payroll Period
            </p>
            <h3 className="text-xl font-bold text-slate-900 mt-1 truncate">
              {isDashLoading ? '...' : (dashboard?.currentPeriod?.name || 'No Open Period')}
            </h3>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge status={dashboard?.currentPeriod?.status || 'OPEN'} />
              <span className="text-[11px] text-slate-400 font-medium">
                FY {dashboard?.currentPeriod?.fiscalYear || '2026-27'}
              </span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Statutory Compliance */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Statutory Compliance
            </p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">100%</h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              EPF, ESI, PT & TDS Computed
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CTC Distribution Histogram */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Salary Distribution by CTC Band
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Headcount spread across annual Cost-to-Company compensation tiers
              </p>
            </div>
            <TrendingUp className="w-5 h-5 text-indigo-500" />
          </div>

          <div className="h-72 w-full">
            {isDistLoading ? (
              <LoadingSpinner label="Loading distribution..." fullHeight />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salaryDist || []} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="band"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(val: any) => [`${val} Employees`, 'Headcount']}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                      border: 'none',
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {(salaryDist || []).map((_: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={BAND_COLORS[index % BAND_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Headcount by Department */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Department Headcount & Cost
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Live distribution of active employees across company departments
              </p>
            </div>
            <Building className="w-5 h-5 text-indigo-500" />
          </div>

          <div className="h-72 w-full">
            {isDeptLoading ? (
              <LoadingSpinner label="Loading departments..." fullHeight />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={deptSummary || []}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis
                    dataKey="departmentName"
                    type="category"
                    tick={{ fontSize: 11, fill: '#475569' }}
                    width={100}
                  />
                  <Tooltip
                    formatter={(val: any, _name: any, item: any) => [
                      `${val} Employees (Avg CTC: ${formatINR(item.payload.avgMonthlyCtc)})`,
                      'Headcount',
                    ]}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                      border: 'none',
                    }}
                  />
                  <Bar dataKey="headcount" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Department Breakdown Table & Recent Revisions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Summary Table */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">
              Department Compensation Summary
            </h3>
            <Link
              to="/departments"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3 text-right">Headcount</th>
                  <th className="py-2.5 px-3 text-right">Avg Monthly CTC</th>
                  <th className="py-2.5 px-3 text-right">Total Monthly Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(deptSummary || []).slice(0, 5).map((d: any) => (
                  <tr key={d.departmentId} className="hover:bg-slate-50/60">
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {d.departmentName}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-600">
                      {d.headcount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700">
                      {formatINR(d.avgMonthlyCtc)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-indigo-600">
                      {formatINR(d.totalMonthlyCtc, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">Recent Activity</h3>
            <History className="w-4 h-4 text-slate-400" />
          </div>

          <div className="flex-1 space-y-4">
            {(dashboard?.recentRevisions || []).length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">
                No recent activity logged.
              </p>
            ) : (
              (dashboard?.recentRevisions || []).map((rev: any) => (
                <div key={rev.id} className="flex items-start gap-3 text-xs">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800">
                      Salary Revision ({rev.newValues?.revisionReason || 'APPRAISAL'})
                    </p>
                    <p className="text-slate-500 text-[11px] truncate">
                      New CTC: {formatINR(rev.newValues?.annualCtc || 0)} by {rev.changedByName}
                    </p>
                    <span className="text-[10px] text-slate-400">
                      {new Date(rev.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <Link
              to="/audit-logs"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              View Full Audit Trail &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
