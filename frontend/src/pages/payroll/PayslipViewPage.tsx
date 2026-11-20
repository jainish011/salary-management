import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Printer,
  User,
} from 'lucide-react';
import { payrollApi } from '../../api/payroll.js';
import { InrAmount } from '../../components/common/InrAmount.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';
import { ErrorMessage } from '../../components/common/ErrorMessage.js';
import { numberToIndianWords } from '../../utils/formatters.js';

export const PayslipViewPage: React.FC = () => {
  const { payslipId } = useParams<{ payslipId: string }>();

  const {
    data: payslip,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['payslip', payslipId],
    queryFn: () => payrollApi.getPayslipById(payslipId!),
    enabled: !!payslipId,
  });

  if (isLoading) {
    return (
      <div className="py-24 flex justify-center">
        <LoadingSpinner size="lg" label="Generating payslip view..." />
      </div>
    );
  }

  if (error || !payslip) {
    return (
      <div className="space-y-4">
        <Link
          to="/payroll"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Payroll
        </Link>
        <ErrorMessage
          title="Payslip Not Found"
          message="Could not load the requested payslip."
        />
      </div>
    );
  }

  const emp = payslip.employee;
  const period = payslip.period;
  const sal = payslip.salaryStructure;

  // Separate earnings items and deduction items if line items are attached
  const earningsItems = payslip.items?.filter((it) => it.itemType === 'EARNING') || [];
  const deductionItems = payslip.items?.filter((it) => it.itemType === 'DEDUCTION') || [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Bar with Navigation and Print (Hidden in Print) */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          to={period ? `/payroll/${period.id}` : '/payroll'}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Payroll Run
        </Link>

        <div className="flex items-center gap-3">
          {emp && (
            <Link
              to={`/employees/${emp.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <User className="w-3.5 h-3.5 text-slate-500" />
              Employee Profile
            </Link>
          )}

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-xs hover:bg-indigo-700 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Printable Payslip Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-8 print:p-0 print:border-none print:shadow-none space-y-6">
        {/* Company Header */}
        <div className="border-b-2 border-indigo-900 pb-5 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-indigo-950 tracking-tight">
              ACME CORPORATION INDIA PVT LTD
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              CIN: U72200KA2020PTC123456 • GSTIN: 29AAAAA0000A1Z5
            </p>
            <p className="text-xs text-slate-500">
              Prestige Tech Park, Outer Ring Road, Bengaluru, Karnataka - 560103
            </p>
          </div>

          <div className="text-center sm:text-right bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-900">
              Payslip Statement
            </div>
            <div className="text-base font-extrabold text-slate-900">
              {period?.periodName || 'Monthly Payroll'}
            </div>
            <div className="text-xs text-slate-500">
              FY {period?.fiscalYear || '2026-27'}
            </div>
          </div>
        </div>

        {/* Employee Details Grid */}
        <div className="bg-slate-50/70 rounded-xl border border-slate-200 p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-4 text-xs">
            <div>
              <span className="text-slate-500 block">Employee Code</span>
              <span className="font-bold text-slate-900 font-mono">
                {emp?.employeeCode || '—'}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block">Employee Name</span>
              <span className="font-bold text-slate-900">
                {emp?.firstName} {emp?.lastName}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block">Department</span>
              <span className="font-medium text-slate-900">
                {emp?.department?.name || '—'}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block">Designation</span>
              <span className="font-medium text-slate-900">
                {emp?.designation || '—'}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block">Date of Joining</span>
              <span className="font-medium text-slate-900">
                {emp?.dateOfJoining
                  ? new Date(emp.dateOfJoining).toLocaleDateString('en-IN')
                  : '—'}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block">PAN Number</span>
              <span className="font-mono font-medium text-slate-900">
                {emp?.panNumber || '—'}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block">Bank Account</span>
              <span className="font-mono font-medium text-slate-900">
                {emp?.bankAccountNumber
                  ? `••••${emp.bankAccountNumber.slice(-4)}`
                  : '—'}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block">Tax Regime</span>
              <span className="font-semibold text-indigo-700">
                {emp?.taxRegime || 'NEW'} Regime
              </span>
            </div>
          </div>
        </div>

        {/* Earnings & Deductions Tables (Two Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Earnings Column */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100/80 px-4 py-2.5 font-bold text-xs uppercase tracking-wider text-slate-700 border-b border-slate-200 flex justify-between">
              <span>Earnings Component</span>
              <span>Amount</span>
            </div>
            <div className="p-4 space-y-2.5 text-xs">
              {earningsItems.length > 0 ? (
                earningsItems.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span className="text-slate-600">{item.itemName}</span>
                    <span className="font-medium text-slate-900">
                      <InrAmount amount={item.amount} />
                    </span>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Basic Salary</span>
                    <span className="font-medium text-slate-900">
                      <InrAmount amount={sal?.basicMonthly} />
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">House Rent Allowance (HRA)</span>
                    <span className="font-medium text-slate-900">
                      <InrAmount amount={sal?.hraMonthly} />
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Leave Travel Allowance (LTA)</span>
                    <span className="font-medium text-slate-900">
                      <InrAmount amount={sal?.ltaMonthly} />
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Special Allowance</span>
                    <span className="font-medium text-slate-900">
                      <InrAmount amount={sal?.specialAllowance} />
                    </span>
                  </div>
                </>
              )}
            </div>
            <div className="bg-indigo-50/50 px-4 py-3 border-t border-slate-200 flex justify-between font-bold text-sm text-indigo-950">
              <span>Total Gross Earnings (A)</span>
              <span>
                <InrAmount amount={payslip.grossEarnings} />
              </span>
            </div>
          </div>

          {/* Deductions Column */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100/80 px-4 py-2.5 font-bold text-xs uppercase tracking-wider text-slate-700 border-b border-slate-200 flex justify-between">
              <span>Deductions Component</span>
              <span>Amount</span>
            </div>
            <div className="p-4 space-y-2.5 text-xs">
              {deductionItems.length > 0 ? (
                deductionItems.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span className="text-slate-600">{item.itemName}</span>
                    <span className="font-medium text-slate-900">
                      <InrAmount amount={item.amount} />
                    </span>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Employee Provident Fund (EPF)</span>
                    <span className="font-medium text-slate-900">
                      <InrAmount amount={payslip.employeePf} />
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Professional Tax (PT)</span>
                    <span className="font-medium text-slate-900">
                      <InrAmount amount={payslip.professionalTax} />
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Tax Deducted at Source (TDS)</span>
                    <span className="font-medium text-slate-900">
                      <InrAmount amount={payslip.tds} />
                    </span>
                  </div>
                  {payslip.employeeEsi > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Employee ESI</span>
                      <span className="font-medium text-slate-900">
                        <InrAmount amount={payslip.employeeEsi} />
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="bg-rose-50/50 px-4 py-3 border-t border-slate-200 flex justify-between font-bold text-sm text-rose-950">
              <span>Total Deductions (B)</span>
              <span>
                <InrAmount amount={payslip.totalDeductions} />
              </span>
            </div>
          </div>
        </div>

        {/* Employer Retirals Summary Banner */}
        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
          <div>
            <span className="text-slate-500">Employer EPF Contribution:</span>{' '}
            <strong className="text-slate-800">
              <InrAmount amount={payslip.employerPf} />
            </strong>
          </div>
          <div>
            <span className="text-slate-500">Gratuity Provision:</span>{' '}
            <strong className="text-slate-800">
              <InrAmount amount={payslip.gratuityProv} />
            </strong>
          </div>
          <div>
            <span className="text-slate-500">Total Monthly CTC:</span>{' '}
            <strong className="text-slate-800">
              <InrAmount amount={payslip.monthlyCtc} />
            </strong>
          </div>
        </div>

        {/* Net Pay Highlight Box */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-100 block">
              Net In-Hand Salary (A - B)
            </span>
            <div className="text-xs text-emerald-100/90 italic mt-1 font-medium">
              Amount in words: {numberToIndianWords(payslip.netPay)}
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">
            <InrAmount amount={payslip.netPay} />
          </div>
        </div>

        {/* Footer Note */}
        <div className="pt-4 border-t border-slate-200 text-center text-xs text-slate-400">
          <p>
            This is a computer-generated salary slip under ACME HRIS and does not require a physical signature.
          </p>
          <p className="mt-0.5">
            Generated on {new Date(payslip.createdAt).toLocaleDateString('en-IN')} for Employee Code{' '}
            {emp?.employeeCode}
          </p>
        </div>
      </div>
    </div>
  );
};
