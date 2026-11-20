import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext.js';
import { AuthLayout } from './components/layout/AuthLayout.js';
import { AppLayout } from './components/layout/AppLayout.js';
import { ProtectedRoute } from './components/layout/ProtectedRoute.js';
import { LoginPage } from './pages/auth/LoginPage.js';
import { DashboardPage } from './pages/dashboard/DashboardPage.js';
import { EmployeeListPage } from './pages/employees/EmployeeListPage.js';
import { EmployeeDetailPage } from './pages/employees/EmployeeDetailPage.js';
import { EmployeeFormPage } from './pages/employees/EmployeeFormPage.js';
import { SalaryRevisionPage } from './pages/employees/SalaryRevisionPage.js';
import { PayrollListPage } from './pages/payroll/PayrollListPage.js';
import { PayrollDetailPage } from './pages/payroll/PayrollDetailPage.js';
import { PayslipViewPage } from './pages/payroll/PayslipViewPage.js';
import { ReportsPage } from './pages/reports/ReportsPage.js';
import { DepartmentsPage } from './pages/departments/DepartmentsPage.js';
import { AuditLogsPage } from './pages/audit/AuditLogsPage.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
            </Route>

            {/* Protected Application Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/employees" element={<EmployeeListPage />} />
                <Route path="/employees/new" element={<EmployeeFormPage />} />
                <Route path="/employees/:id" element={<EmployeeDetailPage />} />
                <Route path="/employees/:id/edit" element={<EmployeeFormPage />} />
                <Route path="/employees/:id/revise-salary" element={<SalaryRevisionPage />} />
                <Route path="/salary-revision/:employeeId" element={<SalaryRevisionPage />} />
                <Route path="/payroll" element={<PayrollListPage />} />
                <Route path="/payroll/:periodId" element={<PayrollDetailPage />} />
                <Route path="/payslip/:payslipId" element={<PayslipViewPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/departments" element={<DepartmentsPage />} />
                <Route path="/audit-logs" element={<AuditLogsPage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
