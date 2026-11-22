import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  DollarSign,
  Info,
  Loader2,
  Lock,
  TrendingUp,
} from 'lucide-react';
import { employeesApi } from '../../api/employees.js';
import { PageHeader } from '../../components/common/PageHeader.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';
import { InrAmount } from '../../components/common/InrAmount.js';
import { ErrorMessage } from '../../components/common/ErrorMessage.js';
import { calculateSalaryBreakup, estimateTakeHome } from '../../utils/salary.js';

const REASONS = [
  { value: 'APPRAISAL', label: 'Annual Merit Appraisal' },
  { value: 'PROMOTION', label: 'Role & Grade Promotion' },
  { value: 'MARKET_CORRECTION', label: 'Market Benchmarking Correction' },
  { value: 'CORRECTION', label: 'Administrative Rectification' },
];

export const SalaryRevisionPage: React.FC = () => {
  const params = useParams<{ employeeId?: string; id?: string }>();
  const id = params.employeeId || params.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: employee,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeesApi.getById(id!),
    enabled: !!id,
  });

  const currentSal = employee?.currentSalary;
  const isTerminated = employee?.employmentStatus === 'TERMINATED';

  // Form State
  const [newAnnualCtc, setNewAnnualCtc] = useState<number>(1200000);
  const [effectiveFrom, setEffectiveFrom] = useState<string>(
    new Date().toISOString().split('T')[0],
  );
  const [revisionReason, setRevisionReason] = useState<string>('APPRAISAL');
  const [remarks, setRemarks] = useState<string>('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Initialize with current CTC and next valid effective date if available
  useEffect(() => {
    if (currentSal) {
      if (currentSal.annualCtc) {
        setNewAnnualCtc(Math.round(currentSal.annualCtc * 1.1)); // default to 10% hike
      }
      if (currentSal.effectiveFrom) {
        const effDateStr =
          typeof currentSal.effectiveFrom === 'string'
            ? currentSal.effectiveFrom.split('T')[0]
            : new Date(currentSal.effectiveFrom).toISOString().split('T')[0];

        const todayStr = new Date().toISOString().split('T')[0];
        if (effDateStr >= todayStr) {
          // If current salary effective date is today or in future, default to the next day
          const d = new Date(effDateStr);
          d.setDate(d.getDate() + 1);
          setEffectiveFrom(d.toISOString().split('T')[0]);
        } else {
          setEffectiveFrom(todayStr);
        }
      }
    }
  }, [currentSal]);

  // Current Breakup & Take-Home
  const currentBreakup = currentSal
    ? calculateSalaryBreakup(currentSal.annualCtc, employee?.workCity)
    : null;
  const currentTakeHome = currentBreakup
    ? estimateTakeHome(currentBreakup, employee?.taxRegime)
    : null;

  // Proposed Breakup & Take-Home
  const proposedBreakup = calculateSalaryBreakup(newAnnualCtc, employee?.workCity);
  const proposedTakeHome = estimateTakeHome(
    proposedBreakup,
    employee?.taxRegime || 'NEW',
  );

  // Hike calculation
  const currentCtc = currentSal?.annualCtc || 0;
  const ctcDiff = newAnnualCtc - currentCtc;
  const percentChange = currentCtc > 0 ? (ctcDiff / currentCtc) * 100 : 0;
  const inHandDiff =
    proposedTakeHome.netTakeHomeMonthly - (currentTakeHome?.netTakeHomeMonthly || 0);

  // Revision Mutation
  const revisionMutation = useMutation({
    mutationFn: (data: any) => employeesApi.createSalaryRevision(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      queryClient.invalidateQueries({ queryKey: ['salary-history', id] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate(`/employees/${id}`);
    },
    onError: (err: any) => {
      setSubmitError(
        err.response?.data?.message || err.message || 'Failed to submit revision',
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isTerminated) return;
    setSubmitError(null);

    if (!newAnnualCtc || newAnnualCtc < 100000) {
      setSubmitError('Annual CTC must be at least ₹1,00,000');
      return;
    }

    if (!effectiveFrom) {
      setSubmitError('Please specify an effective date');
      return;
    }

    revisionMutation.mutate({
      employeeId: id!,
      annualCtc: Number(newAnnualCtc),
      effectiveFrom,
      revisionReason,
      remarks: remarks.trim() || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="py-24 flex justify-center">
        <LoadingSpinner size="lg" label="Loading employee salary record..." />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="space-y-4">
        <Link
          to="/employees"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Employees
        </Link>
        <ErrorMessage
          title="Employee Not Found"
          message="Could not load employee data for salary revision."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Breadcrumbs */}
      <div className="flex items-center gap-2">
        <Link
          to={`/employees/${id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Cancel & Return to Profile
        </Link>
      </div>

      <PageHeader
        title={`Revise Salary: ${employee.firstName} ${employee.lastName}`}
        description={`Record a new SCD Type 2 compensation revision for ${employee.employeeCode} (${employee.designation}). The previous salary will be preserved in historical records.`}
      />

      {isTerminated && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-sm flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
          <div>
            <p className="font-semibold">Terminated Employee — Salary Frozen</p>
            <p className="text-xs text-rose-700 mt-0.5">
              This employee was terminated{employee.dateOfLeaving ? ` on ${new Date(employee.dateOfLeaving).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}.
              Salary structures and compensation revisions cannot be submitted for terminated employees.
            </p>
          </div>
        </div>
      )}

      {submitError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-3">
          <Info className="w-5 h-5 flex-shrink-0 text-rose-500" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Side-by-Side Comparison Highlight Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Current CTC */}
          <div className="space-y-1">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Current Annual CTC
            </span>
            <div className="text-2xl font-bold text-slate-200">
              <InrAmount amount={currentCtc} />
            </div>
            <div className="text-xs text-slate-400">
              Take-home:{' '}
              <InrAmount amount={currentTakeHome?.netTakeHomeMonthly || 0} />
              /mo
            </div>
          </div>

          {/* Increment Indicator */}
          <div className="flex items-center justify-center md:flex-col gap-2">
            <div
              className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                percentChange >= 0
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              {percentChange >= 0 ? `+${percentChange.toFixed(1)}%` : `${percentChange.toFixed(1)}%`}
            </div>
            <ArrowRight className="w-5 h-5 text-indigo-400 hidden md:block" />
          </div>

          {/* Proposed CTC */}
          <div className="space-y-1">
            <span className="text-xs uppercase tracking-wider text-indigo-300 font-semibold">
              Proposed Annual CTC
            </span>
            <div className="text-3xl font-extrabold text-white">
              <InrAmount amount={newAnnualCtc} />
            </div>
            <div className="text-xs text-emerald-300">
              Take-home: <InrAmount amount={proposedTakeHome.netTakeHomeMonthly} />
              /mo (
              <span className="font-semibold">
                {inHandDiff >= 0 ? `+₹${inHandDiff.toLocaleString('en-IN')}` : `-₹${Math.abs(inHandDiff).toLocaleString('en-IN')}`}
                /mo
              </span>
              )
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Form Inputs (1 col) */}
          <div className="space-y-5 bg-white rounded-xl border border-slate-200 shadow-xs p-6">
            <h2 className="text-base font-semibold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-indigo-600" />
              Revision Details
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                New Annual CTC (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  step="any"
                  min={100000}
                  value={newAnnualCtc}
                  onChange={(e) => setNewAnnualCtc(Number(e.target.value))}
                  className="w-full pl-8 pr-3.5 py-2.5 text-base font-bold text-slate-900 rounded-lg border border-slate-300 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Effective From Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
              />
              <p className="text-xs text-slate-500 mt-1">
                {revisionReason === 'CORRECTION'
                  ? 'Administrative Rectification adjusts the current active salary structure directly.'
                  : 'The current salary will remain active until this effective date.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Revision Reason <span className="text-rose-500">*</span>
              </label>
              <select
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                {REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Remarks / Approval Reference
              </label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. FY26 Performance Appraisal - Exceeds Expectations rating"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Right Detailed Comparison Breakdown (2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-900 pb-3 border-b border-slate-100 flex items-center justify-between">
              <span>Statutory Breakdown Comparison</span>
              <span className="text-xs font-normal text-slate-500">
                City: <strong className="text-slate-700">{employee.workCity}</strong> (
                {employee.workCity && calculateSalaryBreakup(newAnnualCtc, employee.workCity).hraMonthly >
                calculateSalaryBreakup(newAnnualCtc, 'NONMETRO').hraMonthly
                  ? 'Metro 50% HRA'
                  : 'Non-Metro 40% HRA'}
                )
              </span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Salary Component</th>
                    <th className="py-2.5 px-3 text-right">Current / Month</th>
                    <th className="py-2.5 px-3 text-right text-indigo-700">Proposed / Month</th>
                    <th className="py-2.5 px-3 text-right">Difference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2 px-3 text-slate-600">Basic Salary (40%)</td>
                    <td className="py-2 px-3 text-right text-slate-700">
                      <InrAmount amount={currentBreakup?.basicMonthly || 0} />
                    </td>
                    <td className="py-2 px-3 text-right font-medium text-indigo-900">
                      <InrAmount amount={proposedBreakup.basicMonthly} />
                    </td>
                    <td className="py-2 px-3 text-right text-emerald-600 font-semibold">
                      +<InrAmount amount={proposedBreakup.basicMonthly - (currentBreakup?.basicMonthly || 0)} />
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2 px-3 text-slate-600">HRA</td>
                    <td className="py-2 px-3 text-right text-slate-700">
                      <InrAmount amount={currentBreakup?.hraMonthly || 0} />
                    </td>
                    <td className="py-2 px-3 text-right font-medium text-indigo-900">
                      <InrAmount amount={proposedBreakup.hraMonthly} />
                    </td>
                    <td className="py-2 px-3 text-right text-emerald-600 font-semibold">
                      +<InrAmount amount={proposedBreakup.hraMonthly - (currentBreakup?.hraMonthly || 0)} />
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2 px-3 text-slate-600">LTA Monthly</td>
                    <td className="py-2 px-3 text-right text-slate-700">
                      <InrAmount amount={currentBreakup?.ltaMonthly || 0} />
                    </td>
                    <td className="py-2 px-3 text-right font-medium text-indigo-900">
                      <InrAmount amount={proposedBreakup.ltaMonthly} />
                    </td>
                    <td className="py-2 px-3 text-right text-emerald-600 font-semibold">
                      +<InrAmount amount={proposedBreakup.ltaMonthly - (currentBreakup?.ltaMonthly || 0)} />
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2 px-3 text-slate-600">Special Allowance</td>
                    <td className="py-2 px-3 text-right text-slate-700">
                      <InrAmount amount={currentBreakup?.specialAllowance || 0} />
                    </td>
                    <td className="py-2 px-3 text-right font-medium text-indigo-900">
                      <InrAmount amount={proposedBreakup.specialAllowance} />
                    </td>
                    <td className="py-2 px-3 text-right text-emerald-600 font-semibold">
                      +<InrAmount amount={proposedBreakup.specialAllowance - (currentBreakup?.specialAllowance || 0)} />
                    </td>
                  </tr>

                  <tr className="bg-slate-50/70 font-semibold text-slate-900">
                    <td className="py-2.5 px-3">Gross Earnings / Mo</td>
                    <td className="py-2.5 px-3 text-right">
                      <InrAmount amount={currentTakeHome?.grossMonthly || 0} />
                    </td>
                    <td className="py-2.5 px-3 text-right text-indigo-900">
                      <InrAmount amount={proposedTakeHome.grossMonthly} />
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-600">
                      +<InrAmount amount={proposedTakeHome.grossMonthly - (currentTakeHome?.grossMonthly || 0)} />
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2 px-3 text-slate-600">Employer PF (12%)</td>
                    <td className="py-2 px-3 text-right text-slate-700">
                      <InrAmount amount={currentBreakup?.employerPfMonthly || 0} />
                    </td>
                    <td className="py-2 px-3 text-right font-medium text-indigo-900">
                      <InrAmount amount={proposedBreakup.employerPfMonthly} />
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600">
                      <InrAmount amount={proposedBreakup.employerPfMonthly - (currentBreakup?.employerPfMonthly || 0)} />
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2 px-3 text-slate-600">Gratuity Provision (4.81%)</td>
                    <td className="py-2 px-3 text-right text-slate-700">
                      <InrAmount amount={currentBreakup?.gratuityMonthly || 0} />
                    </td>
                    <td className="py-2 px-3 text-right font-medium text-indigo-900">
                      <InrAmount amount={proposedBreakup.gratuityMonthly} />
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600">
                      <InrAmount amount={proposedBreakup.gratuityMonthly - (currentBreakup?.gratuityMonthly || 0)} />
                    </td>
                  </tr>

                  <tr className="bg-indigo-50/40 font-bold text-indigo-950">
                    <td className="py-3 px-3">Monthly Total CTC</td>
                    <td className="py-3 px-3 text-right text-slate-700">
                      <InrAmount amount={currentBreakup?.monthlyCtc || 0} />
                    </td>
                    <td className="py-3 px-3 text-right text-indigo-900">
                      <InrAmount amount={proposedBreakup.monthlyCtc} />
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-600">
                      +<InrAmount amount={proposedBreakup.monthlyCtc - (currentBreakup?.monthlyCtc || 0)} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-emerald-800 font-bold block">
                  Projected Monthly In-Hand
                </span>
                <span className="text-xs text-emerald-600">
                  After EPF, PT & estimated TDS under {employee.taxRegime} Regime
                </span>
              </div>
              <div className="text-xl font-extrabold text-emerald-700">
                <InrAmount amount={proposedTakeHome.netTakeHomeMonthly} />
              </div>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Link
            to={`/employees/${id}`}
            className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={revisionMutation.isPending || isTerminated}
            className="px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-xs hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {revisionMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Applying Revision...</span>
              </>
            ) : isTerminated ? (
              <>
                <Lock className="w-4 h-4" />
                <span>Salary Frozen (Terminated)</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Apply Salary Revision</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
