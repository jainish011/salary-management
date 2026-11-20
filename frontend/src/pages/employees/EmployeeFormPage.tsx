import React from 'react';
import { PageHeader } from '../../components/common/PageHeader.js';

export const EmployeeFormPage: React.FC = () => {
  return (
    <div>
      <PageHeader title="Employee Registration" description="Onboard or update employee profile." />
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <p className="text-slate-600 font-medium">Employee Form Module</p>
      </div>
    </div>
  );
};
