import React from 'react';
import { PageHeader } from '../../components/common/PageHeader.js';

export const DashboardPage: React.FC = () => {
  return (
    <div>
      <PageHeader
        title="Executive HR Dashboard"
        description="Overview of organization headcount, monthly payroll, and salary distribution."
      />
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <p className="text-slate-600 font-medium">Dashboard Module (Phase 11)</p>
      </div>
    </div>
  );
};
