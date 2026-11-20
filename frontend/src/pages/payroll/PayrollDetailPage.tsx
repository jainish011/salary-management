import React from 'react';
import { PageHeader } from '../../components/common/PageHeader.js';

export const PayrollDetailPage: React.FC = () => {
  return (
    <div>
      <PageHeader title="Payroll Execution Details" description="Review generated payslips and summary." />
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <p className="text-slate-600 font-medium">Payroll Detail Module</p>
      </div>
    </div>
  );
};
