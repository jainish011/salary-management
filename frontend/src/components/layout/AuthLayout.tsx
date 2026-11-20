import React from 'react';
import { Outlet } from 'react-router-dom';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/30">
            A
          </div>
          <span className="text-2xl font-black tracking-tight text-white">ACME</span>
          <span className="text-xs px-2 py-0.5 rounded font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            PAYROLL
          </span>
        </div>
        <h2 className="text-center text-sm font-medium text-slate-400">
          Enterprise Employee Salary Management System
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800/80 backdrop-blur-md py-8 px-6 shadow-2xl border border-slate-700/60 sm:rounded-2xl sm:px-10">
          <Outlet />
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">
          Protected by Enterprise JWT Authentication & RBAC &bull; ACME Corp India
        </p>
      </div>
    </div>
  );
};
