import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Edit2,
  Plus,
  Search,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { departmentsApi } from '../../api/departments.js';
import { PageHeader } from '../../components/common/PageHeader.js';
import { InrAmount } from '../../components/common/InrAmount.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';
import { ErrorMessage } from '../../components/common/ErrorMessage.js';
import { EmptyState } from '../../components/common/EmptyState.js';
import type { Department } from '../../types/index.js';

export const DepartmentsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch Departments
  const {
    data: departments = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.getAll(),
  });

  const openCreateModal = () => {
    setEditingDept(null);
    setName('');
    setDescription('');
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (dept: Department) => {
    setEditingDept(dept);
    setName(dept.name);
    setDescription(dept.description || '');
    setFormError(null);
    setShowModal(true);
  };

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      departmentsApi.create(data),
    onSuccess: () => {
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => {
      setFormError(
        err.response?.data?.message || err.message || 'Failed to create department',
      );
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: (data: { id: string; name?: string; description?: string }) =>
      departmentsApi.update(data.id, { name: data.name, description: data.description }),
    onSuccess: () => {
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => {
      setFormError(
        err.response?.data?.message || err.message || 'Failed to update department',
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Department name is required');
      return;
    }

    if (editingDept) {
      updateMutation.mutate({
        id: editingDept.id,
        name: name.trim(),
        description: description.trim() || undefined,
      });
    } else {
      createMutation.mutate({
        name: name.trim(),
        description: description.trim() || undefined,
      });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Aggregate stats
  const totalHeadcount = departments.reduce((acc, d) => acc + (d.headcount || 0), 0);
  const totalMonthlyPayroll = departments.reduce((acc, d) => acc + (d.totalMonthlyCtc || 0), 0);

  // Filtered departments by name/description
  const filteredDepartments = departments.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      d.name.toLowerCase().includes(q) ||
      (d.description && d.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Departments"
        description="Manage organizational departments, monitor functional headcount, and review allocated compensation budgets."
      >
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-xs hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Department
        </button>
      </PageHeader>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Departments
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              {departments.length}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Corporate business units</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Assigned Headcount
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              {totalHeadcount.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Active workforce</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Monthly Budget Allocation
            </div>
            <div className="text-2xl font-bold text-emerald-700 mt-0.5">
              <InrAmount amount={totalMonthlyPayroll} compact />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Combined monthly CTC</p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter departments by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 w-full sm:w-auto text-left sm:text-right">
          Showing <span className="font-bold text-slate-800">{filteredDepartments.length}</span> of{' '}
          <span className="font-bold text-slate-800">{departments.length}</span> departments
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-24 flex justify-center">
            <LoadingSpinner size="lg" label="Loading departments..." />
          </div>
        ) : error ? (
          <div className="p-6">
            <ErrorMessage
              title="Error Loading Departments"
              message="Failed to fetch department records."
            />
          </div>
        ) : departments.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No Departments Found"
              description="Add your first company department to start organizing employees."
              action={
                <button
                  onClick={openCreateModal}
                  className="px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-xs"
                >
                  + Add Department
                </button>
              }
            />
          </div>
        ) : filteredDepartments.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No Matching Departments"
              description={`No departments match "${searchQuery}". Try a different keyword.`}
              action={
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50"
                >
                  Clear Filter
                </button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Department Name</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Headcount</th>
                  <th className="py-3 px-4 text-right">Avg Monthly CTC</th>
                  <th className="py-3 px-4 text-right">Total Monthly CTC</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDepartments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                        {dept.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span>{dept.name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate text-xs">
                      {dept.description || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-900">
                      {dept.headcount ? dept.headcount.toLocaleString('en-IN') : 0}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-700">
                      <InrAmount amount={dept.avgMonthlyCtc} />
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      <InrAmount amount={dept.totalMonthlyCtc} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openEditModal(dept)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 p-1 rounded hover:bg-indigo-50 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Department Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                {editingDept ? 'Edit Department' : 'Create New Department'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Department Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Core Engineering"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of department function..."
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-xs hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Saving...</span>
                    </>
                  ) : editingDept ? (
                    'Update Department'
                  ) : (
                    'Create Department'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
