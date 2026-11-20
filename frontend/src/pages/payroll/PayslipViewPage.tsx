import React from 'react';
import { PageHeader } from '../../components/common/PageHeader.js';

export const PayslipViewPage: React.FC = () => {
  return (
    <div>
      <PageHeader title="Individual Payslip" description="Full Indian statutory component breakdown." />
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <p className="text-slate-600 font-medium">Payslip View Module</p>
      </div>
    </div>
  );
};
