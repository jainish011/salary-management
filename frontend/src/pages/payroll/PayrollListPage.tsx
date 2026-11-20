import React from 'react';
import { PageHeader } from '../../components/common/PageHeader.js';

export const PayrollListPage: React.FC = () => {
  return (
    <div>
      <PageHeader title="Payroll Periods" description="Manage monthly payroll processing cycles." />
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <p className="text-slate-600 font-medium">Payroll Runs Module (Phase 13)</p>
      </div>
    </div>
  );
};
