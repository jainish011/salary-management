import React from 'react';
import { PageHeader } from '../../components/common/PageHeader.js';

export const ReportsPage: React.FC = () => {
  return (
    <div>
      <PageHeader title="Compensation Analytics & Reports" description="Organization charts and CSV export." />
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <p className="text-slate-600 font-medium">Reports Module (Phase 14)</p>
      </div>
    </div>
  );
};
