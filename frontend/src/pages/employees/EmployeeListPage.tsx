import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Search,
  Filter,
  X,
  UserPlus,
  Eye,
  TrendingUp,
} from 'lucide-react';
import { employeesApi } from '../../api/employees.js';
import { departmentsApi } from '../../api/departments.js';
import { PageHeader } from '../../components/common/PageHeader.js';
import { DataTable } from '../../components/common/DataTable.js';
import { InrAmount } from '../../components/common/InrAmount.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { ErrorMessage } from '../../components/common/ErrorMessage.js';
import type { Employee } from '../../types/index.js';

export const EmployeeListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // URL Query Params state
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const search = searchParams.get('search') || '';
  const departmentId = searchParams.get('departmentId') || '';
  const status = searchParams.get('status') || '';
  const grade = searchParams.get('grade') || '';
  const workCity = searchParams.get('workCity') || '';

  const [searchInput, setSearchInput] = useState(search);

  // Debounce search update
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          if (searchInput.trim()) {
            next.set('search', searchInput.trim());
          } else {
            next.delete('search');
          }
          next.set('page', '1');
          return next;
        });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput, search, setSearchParams]);

  // Fetch departments for filter dropdown
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentsApi.getAll,
    staleTime: 10 * 60 * 1000,
  });

  // Query employees
  const {
    data: response,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['employees', { page, limit, search, departmentId, status, grade, workCity }],
    queryFn: () =>
      employeesApi.getAll({
        page,
        limit,
        search: search || undefined,
        departmentId: departmentId || undefined,
        status: status || undefined,
        grade: grade || undefined,
        workCity: workCity || undefined,
      }),
  });

  const updateFilter = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      if (key !== 'page') {
        next.set('page', '1');
      }
      return next;
    });
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearchParams({ page: '1', limit: limit.toString() });
  };

  const hasActiveFilters = Boolean(search || departmentId || status || grade || workCity);

  const columns = useMemo<ColumnDef<Employee, any>[]>(
    () => [
      {
        accessorKey: 'employeeCode',
        header: 'Code',
        cell: (info) => (
          <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
            {info.getValue()}
          </span>
        ),
      },
      {
        header: 'Employee Name',
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-slate-800">
              {row.original.firstName} {row.original.lastName}
            </p>
            <p className="text-[11px] text-slate-400 truncate">{row.original.email}</p>
          </div>
        ),
      },
      {
        header: 'Department',
        cell: ({ row }) => (
          <span className="text-xs text-slate-700 font-medium">
            {row.original.department?.name || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'designation',
        header: 'Designation',
        cell: (info) => <span className="text-xs text-slate-600">{info.getValue()}</span>,
      },
      {
        accessorKey: 'grade',
        header: 'Grade',
        cell: (info) => (
          <span className="text-[11px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-200">
            {info.getValue()}
          </span>
        ),
      },
      {
        accessorKey: 'workCity',
        header: 'Location',
        cell: ({ row }) => (
          <span className="text-xs text-slate-600">
            {row.original.workCity}, {row.original.workState}
          </span>
        ),
      },
      {
        header: 'Monthly CTC',
        cell: ({ row }) => (
          <InrAmount
            amount={row.original.currentSalary?.monthlyCtc}
            className="text-xs font-semibold text-slate-900"
          />
        ),
      },
      {
        accessorKey: 'employmentStatus',
        header: 'Status',
        cell: (info) => <StatusBadge status={info.getValue()} />,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <Link
              to={`/employees/${row.original.id}`}
              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
              title="View Profile"
            >
              <Eye className="w-4 h-4" />
            </Link>
            <Link
              to={`/salary-revision/${row.original.id}`}
              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition"
              title="Revise Salary"
            >
              <TrendingUp className="w-4 h-4" />
            </Link>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Employee Directory"
        description="Search, filter, and manage organization employee records."
      >
        <Link
          to="/employees/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-xs hover:bg-indigo-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Employee</span>
        </Link>
      </PageHeader>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input with Debounce */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by employee name, email, code (EMP000001)..."
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
            {/* Department */}
            <select
              value={departmentId}
              onChange={(e) => updateFilter('departmentId', e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Departments</option>
              {(departments || []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            {/* Status */}
            <select
              value={status}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="TERMINATED">Terminated</option>
            </select>

            {/* Grade */}
            <select
              value={grade}
              onChange={(e) => updateFilter('grade', e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Grades</option>
              {['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'].map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>

            {/* City */}
            <select
              value={workCity}
              onChange={(e) => updateFilter('workCity', e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Cities</option>
              {['Mumbai', 'Bangalore', 'Hyderabad', 'Delhi', 'Pune', 'Chennai', 'Kolkata'].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition"
              >
                <Filter className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {error ? (
        <ErrorMessage
          title="Could not load employees"
          message="Failed to fetch employee list from server."
          onRetry={refetch}
        />
      ) : (
        <DataTable
          columns={columns}
          data={response?.data || []}
          pageIndex={page - 1}
          pageSize={limit}
          pageCount={response?.meta?.totalPages || 1}
          totalRecords={response?.meta?.total}
          isLoading={isLoading}
          onPageChange={(p) => updateFilter('page', p.toString())}
          onPageSizeChange={(s) => updateFilter('limit', s.toString())}
          onRowClick={(emp) => navigate(`/employees/${emp.id}`)}
        />
      )}
    </div>
  );
};
