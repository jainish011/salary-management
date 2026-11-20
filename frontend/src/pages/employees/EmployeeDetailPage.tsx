import React from 'react';
import { PageHeader } from '../../components/common/PageHeader.js';

export const EmployeeDetailPage: React.FC = () => {
  return (
    <div>
      <PageHeader title="Employee Profile" description="Detailed employee info and compensation." />
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <p className="text-slate-600 font-medium">Employee Detail Module</p>
      </div>
    </div>
  );
};
