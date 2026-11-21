import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Edit,
  FileSpreadsheet,
  FileText,
  History,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
  TrendingUp,
  User,
  UserX,
} from 'lucide-react';
import { employeesApi } from '../../api/employees.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { InrAmount } from '../../components/common/InrAmount.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';
import { ErrorMessage } from '../../components/common/ErrorMessage.js';
import { EmptyState } from '../../components/common/EmptyState.js';
import { estimateTakeHome } from '../../utils/salary.js';

export const EmployeeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showTerminateModal, setShowTerminateModal] = useState(false);

  // Fetch employee details
  const {
    data: employee,
    isLoading: isEmpLoading,
    error: empError,
    refetch,
  } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeesApi.getById(id!),
    enabled: !!id,
  });

  // Fetch salary history
  const {
    data: salaryHistory = [],
    isLoading: isHistoryLoading,
  } = useQuery({
    queryKey: ['salary-history', id],
    queryFn: () => employeesApi.getSalaryHistory(id!),
    enabled: !!id,
  });

  // Fetch recent payslips
  const {
    data: payslipsResponse,
    isLoading: isPayslipsLoading,
  } = useQuery({
    queryKey: ['employee-payslips', id],
    queryFn: () => employeesApi.getPayslips(id!, 1, 12),
    enabled: !!id,
  });

  // Terminate mutation
  const terminateMutation = useMutation({
    mutationFn: () => employeesApi.delete(id!),
    onSuccess: () => {
      setShowTerminateModal(false);
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      refetch();
    },
  });

  if (isEmpLoading) {
    return (
      <div className="py-24 flex justify-center">
        <LoadingSpinner size="lg" label="Loading employee profile..." />
      </div>
    );
  }

  if (empError || !employee) {
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
          message="Could not load the requested employee record. It may have been deleted or the ID is invalid."
        />
      </div>
    );
  }

  const currentSal = employee.currentSalary;
  const takeHome = currentSal
    ? estimateTakeHome(
        {
          annualCtc: currentSal.annualCtc,
          monthlyCtc: currentSal.monthlyCtc,
          basicMonthly: currentSal.basicMonthly,
          hraMonthly: currentSal.hraMonthly,
          ltaMonthly: currentSal.ltaMonthly,
          specialAllowance: currentSal.specialAllowance,
          otherAllowances: currentSal.otherAllowances || 0,
          employerPfMonthly: currentSal.employerPfMonthly,
          gratuityMonthly: currentSal.gratuityMonthly,
        },
        employee.taxRegime,
      )
    : null;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/employees"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Employee Directory
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to={`/employees/${employee.id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg shadow-xs hover:bg-slate-50 transition-colors"
          >
            <Edit className="w-4 h-4 text-slate-500" />
            Edit Profile
          </Link>

          <Link
            to={`/salary-revision/${employee.id}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-xs hover:bg-indigo-700 transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            Revise Salary
          </Link>

          {employee.employmentStatus !== 'TERMINATED' && (
            <button
              onClick={() => setShowTerminateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg shadow-xs hover:bg-rose-100 transition-colors"
            >
              <UserX className="w-4 h-4" />
              Terminate
            </button>
          )}
        </div>
      </div>

      {/* Unified Profile Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center font-bold text-2xl text-indigo-700 shrink-0 shadow-xs">
              {employee.firstName[0]}
              {employee.lastName[0]}
            </div>
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-normal">
                  {employee.firstName} {employee.lastName}
                </h1>
                <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {employee.employeeCode}
                </span>
                <StatusBadge status={employee.employmentStatus} />
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  Grade {employee.grade}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <span>{employee.designation}</span>
                <span className="text-slate-300">•</span>
                <span>{employee.department?.name || 'Department N/A'}</span>
              </p>
            </div>
          </div>

          {currentSal && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 flex items-center gap-6 shrink-0">
              <div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Annual CTC
                </div>
                <div className="text-lg font-bold text-indigo-900 mt-0.5">
                  <InrAmount amount={currentSal.annualCtc} />
                </div>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Monthly Gross
                </div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">
                  <InrAmount
                    amount={
                      currentSal.basicMonthly +
                      currentSal.hraMonthly +
                      currentSal.ltaMonthly +
                      currentSal.specialAllowance
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grid Layout: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (1 col): Personal & Statutory Details */}
        <div className="space-y-6">
          {/* Personal & Employment Details */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <User className="w-4 h-4 text-indigo-600" />
              Employee Details
            </h2>

            <dl className="mt-4 space-y-3.5 text-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <dt className="text-slate-500 flex items-center gap-2 shrink-0">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> Email
                </dt>
                <dd className="font-medium text-slate-900 break-all sm:text-right select-all">
                  {employee.email}
                </dd>
              </div>

              <div className="flex items-center justify-between">
                <dt className="text-slate-500 flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone
                </dt>
                <dd className="font-medium text-slate-900">{employee.phone || '—'}</dd>
              </div>

              <div className="flex items-center justify-between">
                <dt className="text-slate-500 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> Location
                </dt>
                <dd className="font-medium text-slate-900">
                  {employee.workCity}, {employee.workState}
                </dd>
              </div>

              <div className="flex items-center justify-between">
                <dt className="text-slate-500 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date of Joining
                </dt>
                <dd className="font-medium text-slate-900">
                  {new Date(employee.dateOfJoining).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </dd>
              </div>

              <div className="flex items-center justify-between">
                <dt className="text-slate-500 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date of Birth
                </dt>
                <dd className="font-medium text-slate-900">
                  {employee.dateOfBirth
                    ? new Date(employee.dateOfBirth).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'}
                </dd>
              </div>

              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Gender</dt>
                <dd className="font-medium text-slate-900">{employee.gender || '—'}</dd>
              </div>

              {employee.dateOfLeaving && (
                <div className="flex items-center justify-between text-rose-600 bg-rose-50 px-2 py-1 rounded">
                  <dt className="font-medium">Date of Exit</dt>
                  <dd className="font-semibold">
                    {new Date(employee.dateOfLeaving).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Statutory & Banking Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Statutory & Banking
            </h2>

            <dl className="mt-4 space-y-3.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Tax Regime</dt>
                <dd>
                  <span className="font-semibold text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {employee.taxRegime} Regime
                  </span>
                </dd>
              </div>

              <div className="flex items-center justify-between">
                <dt className="text-slate-500">PAN Number</dt>
                <dd className="font-mono font-medium text-slate-900">
                  {employee.panNumber || '—'}
                </dd>
              </div>

              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Bank Account</dt>
                <dd className="font-mono font-medium text-slate-900">
                  {employee.bankAccountNumber
                    ? `••••${employee.bankAccountNumber.slice(-4)}`
                    : '—'}
                </dd>
              </div>

              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Bank IFSC</dt>
                <dd className="font-mono font-medium text-slate-900">
                  {employee.bankIfsc || '—'}
                </dd>
              </div>

              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Department</dt>
                <dd className="font-medium text-slate-900">
                  {employee.department?.name || 'Unassigned'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Right Column (2 cols): Compensation Structure, Estimated Take-Home & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Salary Breakdown */}
          {currentSal ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-base font-semibold text-slate-900">
                    Active Salary Structure (SCD Type 2)
                  </h2>
                </div>
                <div className="text-xs text-slate-500">
                  Effective since{' '}
                  <span className="font-semibold text-slate-700">
                    {new Date(currentSal.effectiveFrom).toLocaleDateString('en-IN', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Monthly Earnings Table */}
                  <div className="border border-slate-100 rounded-lg p-4 bg-slate-50/30">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                      Monthly Earnings
                    </h3>
                    <div className="space-y-2.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Basic Salary (40%)</span>
                        <span className="font-medium text-slate-900">
                          <InrAmount amount={currentSal.basicMonthly} />
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">HRA</span>
                        <span className="font-medium text-slate-900">
                          <InrAmount amount={currentSal.hraMonthly} />
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">LTA</span>
                        <span className="font-medium text-slate-900">
                          <InrAmount amount={currentSal.ltaMonthly} />
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Special Allowance</span>
                        <span className="font-medium text-slate-900">
                          <InrAmount amount={currentSal.specialAllowance} />
                        </span>
                      </div>
                      <div className="pt-2 border-t border-slate-200 flex justify-between font-semibold text-slate-900">
                        <span>Gross Earnings</span>
                        <span>
                          <InrAmount
                            amount={
                              currentSal.basicMonthly +
                              currentSal.hraMonthly +
                              currentSal.ltaMonthly +
                              currentSal.specialAllowance
                            }
                          />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Employer Contributions & In-Hand Estimate */}
                  <div className="space-y-4">
                    <div className="border border-slate-100 rounded-lg p-4 bg-slate-50/30">
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                        Employer Retirals & Benefits
                      </h3>
                      <div className="space-y-2.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Employer PF (12%)</span>
                          <span className="font-medium text-slate-900">
                            <InrAmount amount={currentSal.employerPfMonthly} />
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Gratuity Provision (4.81%)</span>
                          <span className="font-medium text-slate-900">
                            <InrAmount amount={currentSal.gratuityMonthly} />
                          </span>
                        </div>
                        <div className="pt-2 border-t border-slate-200 flex justify-between font-semibold text-slate-900">
                          <span>Total Monthly CTC</span>
                          <span>
                            <InrAmount amount={currentSal.monthlyCtc} />
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Take-Home Pay Highlight Card */}
                    {takeHome && (
                      <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                            Est. Monthly Take-Home
                          </span>
                          <span className="text-xs text-emerald-600 font-medium">
                            {employee.taxRegime} Regime
                          </span>
                        </div>
                        <div className="text-2xl font-bold text-emerald-700">
                          <InrAmount amount={takeHome.netTakeHomeMonthly} />
                        </div>
                        <p className="text-xs text-emerald-600 mt-1">
                          After Employee PF (<InrAmount amount={takeHome.employeePf} />), PT (₹200) & estimated TDS (
                          <InrAmount amount={takeHome.estimatedTdsMonthly} />)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              title="No Active Salary Structure"
              description="This employee does not have an active compensation record."
            />
          )}

          {/* Salary Revision History (SCD Type 2 Timeline) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-semibold text-slate-900">
                  Compensation History (SCD Type 2)
                </h2>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {salaryHistory.length} Revision{salaryHistory.length === 1 ? '' : 's'}
              </span>
            </div>

            {isHistoryLoading ? (
              <div className="p-8 flex justify-center">
                <LoadingSpinner size="md" label="Loading revision history..." />
              </div>
            ) : salaryHistory.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                No historical revisions found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Effective Dates</th>
                      <th className="py-3 px-4">Annual CTC</th>
                      <th className="py-3 px-4">Monthly CTC</th>
                      <th className="py-3 px-4">Basic</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {salaryHistory.map((s, idx) => {
                      const isCurrent = !s.effectiveTo;
                      return (
                        <tr
                          key={s.id || idx}
                          className={`hover:bg-slate-50/50 transition-colors ${
                            isCurrent ? 'bg-indigo-50/20' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-medium text-slate-900">
                            {new Date(s.effectiveFrom).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                            <span className="mx-1 text-slate-400">→</span>
                            {s.effectiveTo ? (
                              new Date(s.effectiveTo).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            ) : (
                              <span className="text-emerald-600 font-semibold">Present</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            <InrAmount amount={s.annualCtc} />
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            <InrAmount amount={s.monthlyCtc} />
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            <InrAmount amount={s.basicMonthly} />
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              {s.revisionReason || 'REVISION'}
                            </span>
                            {s.remarks && (
                              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">
                                {s.remarks}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {isCurrent ? (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Active
                              </span>
                            ) : (
                              <span className="text-xs font-medium text-slate-400">
                                Superseded
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Payslips Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-semibold text-slate-900">Generated Payslips</h2>
              </div>
            </div>

            {isPayslipsLoading ? (
              <div className="p-8 flex justify-center">
                <LoadingSpinner size="md" label="Loading payslips..." />
              </div>
            ) : !payslipsResponse || payslipsResponse.data.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                No payslips generated for this employee yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Period</th>
                      <th className="py-3 px-4">Gross Earnings</th>
                      <th className="py-3 px-4">Deductions</th>
                      <th className="py-3 px-4">Net Take-Home</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payslipsResponse.data.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {p.period?.periodName || 'Payroll Period'}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          <InrAmount amount={p.grossEarnings} />
                        </td>
                        <td className="py-3 px-4 text-rose-600">
                          <InrAmount amount={p.totalDeductions} />
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-700">
                          <InrAmount amount={p.netPay} />
                        </td>
                        <td className="py-3 px-4 text-right">
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
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Termination */}
      {showTerminateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Terminate Employee</h3>
            </div>
            <p className="text-sm text-slate-600">
              Are you sure you want to terminate{' '}
              <strong className="text-slate-900">
                {employee.firstName} {employee.lastName}
              </strong>{' '}
              ({employee.employeeCode})? Their employment status will become{' '}
              <span className="font-semibold text-rose-600">TERMINATED</span>, setting their
              date of leaving to today and excluding them from subsequent payroll runs.
            </p>
            {terminateMutation.isError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                {(terminateMutation.error as any)?.response?.data?.message ||
                  (terminateMutation.error as Error)?.message ||
                  'Failed to terminate employee.'}
              </div>
            )}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  terminateMutation.reset();
                  setShowTerminateModal(false);
                }}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                disabled={terminateMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => terminateMutation.mutate()}
                className="px-4 py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={terminateMutation.isPending}
              >
                {terminateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Terminating...</span>
                  </>
                ) : (
                  'Confirm Termination'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
