import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import {
  BarChart3,
  Building2,
  Download,
  Layers,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import { reportsApi } from '../../api/reports.js';
import { PageHeader } from '../../components/common/PageHeader.js';
import { InrAmount, formatINR } from '../../components/common/InrAmount.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

export const ReportsPage: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);

  // Queries
  const {
    data: deptSummary = [],
    isLoading: isDeptLoading,
  } = useQuery({
    queryKey: ['report-department-summary'],
    queryFn: () => reportsApi.getDepartmentSummary(),
  });

  const {
    data: salaryDist = [],
    isLoading: isDistLoading,
  } = useQuery({
    queryKey: ['report-salary-distribution'],
    queryFn: () => reportsApi.getSalaryDistribution(),
  });

  const {
    data: payrollTrend = [],
    isLoading: isTrendLoading,
  } = useQuery({
    queryKey: ['report-payroll-trend'],
    queryFn: () => reportsApi.getPayrollTrend(12),
  });

  const {
    data: gradeSummary = [],
    isLoading: isGradeLoading,
  } = useQuery({
    queryKey: ['report-grade-summary'],
    queryFn: () => reportsApi.getGradeSummary(),
  });

  const {
    data: cityHeadcount = [],
    isLoading: isCityLoading,
  } = useQuery({
    queryKey: ['report-headcount-by-city'],
    queryFn: () => reportsApi.getHeadcountByCity(),
  });

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      await reportsApi.downloadEmployeesCsv();
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setIsExporting(false);
    }
  };

  const isLoading =
    isDeptLoading || isDistLoading || isTrendLoading || isGradeLoading || isCityLoading;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Analytics & Reports"
        description="Statutory salary benchmarks, grade progression, headcount distribution, and historical payroll trends."
      >
        <button
          onClick={handleExportCsv}
          disabled={isExporting}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-xs hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {isExporting ? (
            <>
              <LoadingSpinner size="sm" />
              <span>Exporting CSV...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Download Master CSV (10,000 Rows)
            </>
          )}
        </button>
      </PageHeader>

      {isLoading ? (
        <div className="py-24 flex justify-center">
          <LoadingSpinner size="lg" label="Generating analytics and charts..." />
        </div>
      ) : (
        <>
          {/* Top Charts Grid: 2 Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Average CTC by Department */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-base font-semibold text-slate-900">
                    Average Annual CTC by Department
                  </h2>
                </div>
                <span className="text-xs text-slate-500">In Lakhs (₹)</span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={deptSummary}
                    margin={{ top: 10, right: 10, left: 10, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                    />
                    <YAxis
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}L`}
                    />
                    <Tooltip
                      formatter={(value: any) => [formatINR(Number(value)), 'Avg CTC']}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="avgAnnualCtc" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Payroll Trend */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-base font-semibold text-slate-900">
                    Historical Payroll Trend (Net Pay)
                  </h2>
                </div>
                <span className="text-xs text-slate-500">Recorded Cycles</span>
              </div>

              <div className="h-72 w-full">
                {payrollTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={payrollTrend}
                      margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="periodName"
                        tick={{ fill: '#64748b', fontSize: 11 }}
                      />
                      <YAxis
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        tickFormatter={(val) => `₹${(val / 10000000).toFixed(1)}Cr`}
                      />
                      <Tooltip
                        formatter={(value: any) => [formatINR(Number(value)), 'Total Net Pay']}
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          fontSize: '12px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="totalNet"
                        stroke="#059669"
                        strokeWidth={3}
                        dot={{ r: 5, fill: '#059669' }}
                        activeDot={{ r: 7 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No historical trend data yet. Complete and lock additional periods to see trends.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Middle Charts Grid: CTC Distribution & Headcount by City */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CTC Distribution Histogram */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  <h2 className="text-base font-semibold text-slate-900">
                    Salary Distribution (CTC Bands)
                  </h2>
                </div>
                <span className="text-xs text-slate-500">10,000 Employees</span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={salaryDist}
                    margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="band"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                    />
                    <YAxis
                      tick={{ fill: '#64748b', fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value: any) => [Number(value).toLocaleString('en-IN'), 'Employees']}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Headcount by City */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-amber-600" />
                  <h2 className="text-base font-semibold text-slate-900">
                    Headcount by Work Location
                  </h2>
                </div>
                <span className="text-xs text-slate-500">Metro vs Tier-1/2 Hubs</span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={cityHeadcount}
                    margin={{ top: 10, right: 20, left: 40, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis
                      dataKey="city"
                      type="category"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value: any) => [Number(value).toLocaleString('en-IN'), 'Headcount']}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Grade Summary Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-semibold text-slate-900">
                  Grade-Level Compensation Benchmarks
                </h2>
              </div>
              <span className="text-xs text-slate-500">
                L1 (Entry) to L7 (Executive Leadership)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-6">Grade</th>
                    <th className="py-3 px-6">Headcount</th>
                    <th className="py-3 px-6">Minimum Annual CTC</th>
                    <th className="py-3 px-6">Average Annual CTC</th>
                    <th className="py-3 px-6">Maximum Annual CTC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gradeSummary.map((g: any) => (
                    <tr key={g.grade} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-6 font-bold text-slate-900">
                        <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono text-xs font-bold">
                          Grade {g.grade}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 font-medium text-slate-800">
                        {Number(g.count).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-6 text-slate-600">
                        <InrAmount amount={g.minCtc} />
                      </td>
                      <td className="py-3.5 px-6 font-semibold text-indigo-900">
                        <InrAmount amount={g.avgCtc} />
                      </td>
                      <td className="py-3.5 px-6 text-slate-600">
                        <InrAmount amount={g.maxCtc} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
