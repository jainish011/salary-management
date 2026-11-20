import React from 'react';
import { PageHeader } from '../../components/common/PageHeader.js';

export const DepartmentsPage: React.FC = () => {
  return (
    <div>
      <PageHeader title="Departments" description="Manage company organizational units." />
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <p className="text-slate-600 font-medium">Departments Module (Phase 15)</p>
      </div>
    </div>
  );
};
