import React from 'react';
import { PageHeader } from '../../components/common/PageHeader.js';

export const EmployeeListPage: React.FC = () => {
  return (
    <div>
      <PageHeader
        title="Employee Directory"
        description="Search, filter, and manage records across all 10,000 employees."
      />
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <p className="text-slate-600 font-medium">Employee List Module (Phase 12)</p>
      </div>
    </div>
  );
};
