import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Building2,
  CreditCard,
  DollarSign,
  Info,
  Save,
  User,
} from 'lucide-react';
import { employeesApi } from '../../api/employees.js';
import { departmentsApi } from '../../api/departments.js';
import { PageHeader } from '../../components/common/PageHeader.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';
import { InrAmount } from '../../components/common/InrAmount.js';
import {
  INDIAN_CITIES_AND_STATES,
  calculateSalaryBreakup,
  estimateTakeHome,
} from '../../utils/salary.js';
import type { EmploymentStatus, TaxRegime } from '../../types/index.js';

const GRADES = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'];

export const EmployeeFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Departments for dropdown
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.getAll(),
  });

  // If edit mode, fetch employee details
  const { data: existingEmployee, isLoading: isFetchingEmployee } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeesApi.getById(id!),
    enabled: isEditMode,
  });

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: 'MALE',
    dateOfJoining: new Date().toISOString().split('T')[0],
    departmentId: '',
    designation: '',
    grade: 'L3',
    employmentStatus: 'ACTIVE' as EmploymentStatus,
    workCity: 'Bengaluru',
    workState: 'Karnataka',
    taxRegime: 'NEW' as TaxRegime,
    panNumber: '',
    bankAccountNumber: '',
    bankIfsc: '',
    annualCtc: 1200000,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Populate data when editing
  useEffect(() => {
    if (existingEmployee) {
      setFormData({
        firstName: existingEmployee.firstName || '',
        lastName: existingEmployee.lastName || '',
        email: existingEmployee.email || '',
        phone: existingEmployee.phone || '',
        dateOfBirth: existingEmployee.dateOfBirth
          ? existingEmployee.dateOfBirth.split('T')[0]
          : '',
        gender: existingEmployee.gender || 'MALE',
        dateOfJoining: existingEmployee.dateOfJoining
          ? existingEmployee.dateOfJoining.split('T')[0]
          : '',
        departmentId: existingEmployee.departmentId || '',
        designation: existingEmployee.designation || '',
        grade: existingEmployee.grade || 'L3',
        employmentStatus: existingEmployee.employmentStatus || 'ACTIVE',
        workCity: existingEmployee.workCity || 'Bengaluru',
        workState: existingEmployee.workState || 'Karnataka',
        taxRegime: existingEmployee.taxRegime || 'NEW',
        panNumber: existingEmployee.panNumber || '',
        bankAccountNumber: existingEmployee.bankAccountNumber || '',
        bankIfsc: existingEmployee.bankIfsc || '',
        annualCtc: existingEmployee.currentSalary?.annualCtc || 1200000,
      });
    }
  }, [existingEmployee]);

  // Handle City change & auto-populate State
  const handleCityChange = (city: string) => {
    const state = INDIAN_CITIES_AND_STATES[city] || formData.workState;
    setFormData((prev) => ({
      ...prev,
      workCity: city,
      workState: state,
    }));
  };

  // Live salary calculation
  const salaryBreakup = calculateSalaryBreakup(
    formData.annualCtc || 0,
    formData.workCity,
  );
  const takeHome = estimateTakeHome(salaryBreakup, formData.taxRegime);

  // Validation
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email address';
    }

    if (!formData.dateOfJoining) errors.dateOfJoining = 'Joining date is required';
    if (!formData.designation.trim()) errors.designation = 'Designation is required';
    if (!formData.departmentId) errors.departmentId = 'Department is required';

    if (!isEditMode && (!formData.annualCtc || formData.annualCtc < 100000)) {
      errors.annualCtc = 'Annual CTC must be at least ₹1,00,000';
    }

    if (formData.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNumber.toUpperCase())) {
      errors.panNumber = 'Invalid PAN format (e.g., ABCDE1234F)';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => employeesApi.create(data),
    onSuccess: (newEmp) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate(`/employees/${newEmp.id}`);
    },
    onError: (err: any) => {
      setSubmitError(
        err.response?.data?.message || err.message || 'Failed to create employee',
      );
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => employeesApi.update(id!, data),
    onSuccess: (updatedEmp) => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      navigate(`/employees/${updatedEmp.id}`);
    },
    onError: (err: any) => {
      setSubmitError(
        err.response?.data?.message || err.message || 'Failed to update employee',
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) return;

    if (isEditMode) {
      // Exclude annualCtc from employee update (salary revision is handled separately)
      const { annualCtc, ...updatePayload } = formData;
      updateMutation.mutate({
        ...updatePayload,
        panNumber: updatePayload.panNumber ? updatePayload.panNumber.toUpperCase() : null,
        bankIfsc: updatePayload.bankIfsc ? updatePayload.bankIfsc.toUpperCase() : null,
      });
    } else {
      createMutation.mutate({
        ...formData,
        panNumber: formData.panNumber ? formData.panNumber.toUpperCase() : null,
        bankIfsc: formData.bankIfsc ? formData.bankIfsc.toUpperCase() : null,
        annualCtc: Number(formData.annualCtc),
      });
    }
  };

  if (isEditMode && isFetchingEmployee) {
    return (
      <div className="py-24 flex justify-center">
        <LoadingSpinner size="lg" label="Loading employee record..." />
      </div>
    );
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Breadcrumb Header */}
      <div className="flex items-center gap-2">
        <Link
          to={isEditMode ? `/employees/${id}` : '/employees'}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {isEditMode ? 'Cancel Edit' : 'Back to Directory'}
        </Link>
      </div>

      <PageHeader
        title={isEditMode ? `Edit Employee: ${formData.firstName} ${formData.lastName}` : 'Add New Employee'}
        description={
          isEditMode
            ? 'Update employee personal, job and statutory details. Salary structure changes require a formal salary revision.'
            : 'Register a new employee into ACME Corp with automatic SCD Type 2 salary structure generation.'
        }
      />

      {submitError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-3">
          <Info className="w-5 h-5 flex-shrink-0 text-rose-500" />
          <span>{submitError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Personal Information */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
            <User className="w-4 h-4 text-indigo-600" />
            1. Personal Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, firstName: e.target.value }))
                }
                placeholder="e.g. Ramesh"
                className={`w-full px-3.5 py-2 text-sm rounded-lg border bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all ${
                  formErrors.firstName ? 'border-rose-400 ring-rose-200' : 'border-slate-300'
                }`}
              />
              {formErrors.firstName && (
                <p className="text-xs text-rose-600 mt-1">{formErrors.firstName}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Last Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, lastName: e.target.value }))
                }
                placeholder="e.g. Sharma"
                className={`w-full px-3.5 py-2 text-sm rounded-lg border bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all ${
                  formErrors.lastName ? 'border-rose-400 ring-rose-200' : 'border-slate-300'
                }`}
              />
              {formErrors.lastName && (
                <p className="text-xs text-rose-600 mt-1">{formErrors.lastName}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Work Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="ramesh.sharma@acme.com"
                className={`w-full px-3.5 py-2 text-sm rounded-lg border bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all ${
                  formErrors.email ? 'border-rose-400 ring-rose-200' : 'border-slate-300'
                }`}
              />
              {formErrors.email && (
                <p className="text-xs text-rose-600 mt-1">{formErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Date of Birth
              </label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, dateOfBirth: e.target.value }))
                }
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Gender
              </label>
              <select
                value={formData.gender}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, gender: e.target.value }))
                }
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Job & Employment Details */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building2 className="w-4 h-4 text-indigo-600" />
            2. Employment & Location Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Department <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.departmentId}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, departmentId: e.target.value }))
                }
                className={`w-full px-3.5 py-2 text-sm rounded-lg border bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all ${
                  formErrors.departmentId ? 'border-rose-400 ring-rose-200' : 'border-slate-300'
                }`}
              >
                <option value="">Select Department...</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
              {formErrors.departmentId && (
                <p className="text-xs text-rose-600 mt-1">{formErrors.departmentId}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Designation <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, designation: e.target.value }))
                }
                placeholder="e.g. Senior Software Engineer"
                className={`w-full px-3.5 py-2 text-sm rounded-lg border bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all ${
                  formErrors.designation ? 'border-rose-400 ring-rose-200' : 'border-slate-300'
                }`}
              />
              {formErrors.designation && (
                <p className="text-xs text-rose-600 mt-1">{formErrors.designation}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Grade Level <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.grade}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, grade: e.target.value }))
                }
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Date of Joining <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.dateOfJoining}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, dateOfJoining: e.target.value }))
                }
                className={`w-full px-3.5 py-2 text-sm rounded-lg border bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all ${
                  formErrors.dateOfJoining ? 'border-rose-400 ring-rose-200' : 'border-slate-300'
                }`}
              />
              {formErrors.dateOfJoining && (
                <p className="text-xs text-rose-600 mt-1">{formErrors.dateOfJoining}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Work City <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.workCity}
                onChange={(e) => handleCityChange(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                {Object.keys(INDIAN_CITIES_AND_STATES).map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Work State
              </label>
              <input
                type="text"
                readOnly
                value={formData.workState}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 bg-slate-100 text-slate-700 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Statutory & Banking Details */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
            <CreditCard className="w-4 h-4 text-indigo-600" />
            3. Statutory & Taxation Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Income Tax Regime <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.taxRegime}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    taxRegime: e.target.value as TaxRegime,
                  }))
                }
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                <option value="NEW">New Tax Regime (Section 115BAC)</option>
                <option value="OLD">Old Tax Regime (with 80C/80D/HRA)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                PAN Number
              </label>
              <input
                type="text"
                maxLength={10}
                value={formData.panNumber}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    panNumber: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="ABCDE1234F"
                className={`w-full px-3.5 py-2 text-sm font-mono rounded-lg border bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all ${
                  formErrors.panNumber ? 'border-rose-400 ring-rose-200' : 'border-slate-300'
                }`}
              />
              {formErrors.panNumber && (
                <p className="text-xs text-rose-600 mt-1">{formErrors.panNumber}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Bank IFSC Code
              </label>
              <input
                type="text"
                maxLength={11}
                value={formData.bankIfsc}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    bankIfsc: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="HDFC0001234"
                className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-slate-300 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Bank Account Number
              </label>
              <input
                type="text"
                value={formData.bankAccountNumber}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    bankAccountNumber: e.target.value,
                  }))
                }
                placeholder="e.g. 50100234567890"
                className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-slate-300 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Initial Compensation (Add mode only) */}
        {!isEditMode ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-indigo-600" />
                4. Initial Compensation (Annual CTC)
              </h2>
              <span className="text-xs text-slate-500">
                Auto-calculated under Indian Statutory Standards
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* CTC Input */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Annual CTC (₹) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">
                      ₹
                    </span>
                    <input
                      type="number"
                      step={50000}
                      min={100000}
                      value={formData.annualCtc}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          annualCtc: Number(e.target.value),
                        }))
                      }
                      className={`w-full pl-8 pr-3.5 py-2.5 text-base font-bold text-slate-900 rounded-lg border bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all ${
                        formErrors.annualCtc ? 'border-rose-400 ring-rose-200' : 'border-slate-300'
                      }`}
                    />
                  </div>
                  {formErrors.annualCtc && (
                    <p className="text-xs text-rose-600 mt-1">{formErrors.annualCtc}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    Monthly CTC:{' '}
                    <span className="font-semibold text-slate-700">
                      <InrAmount amount={salaryBreakup.monthlyCtc} />
                    </span>
                  </p>
                </div>

                {/* Take-Home Highlight Card */}
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    Est. In-Hand Monthly Take-Home
                  </div>
                  <div className="text-2xl font-bold text-emerald-700">
                    <InrAmount amount={takeHome.netTakeHomeMonthly} />
                  </div>
                  <p className="text-xs text-emerald-700/80">
                    Gross:{' '}
                    <span className="font-semibold">
                      <InrAmount amount={takeHome.grossMonthly} />
                    </span>{' '}
                    • Deductions:{' '}
                    <span className="font-semibold">
                      <InrAmount amount={takeHome.totalDeductions} />
                    </span>
                  </p>
                </div>
              </div>

              {/* Dynamic Live Breakdown Table */}
              <div className="lg:col-span-2 border border-slate-200 rounded-xl p-4 bg-slate-50/40">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Live Statutory Breakdown Preview
                </h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Basic (40%)</span>
                    <span className="font-medium text-slate-900">
                      <InrAmount amount={salaryBreakup.basicMonthly} />
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">HRA ({formData.workCity ? '50%/40%' : '40%'})</span>
                    <span className="font-medium text-slate-900">
                      <InrAmount amount={salaryBreakup.hraMonthly} />
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">LTA Monthly</span>
                    <span className="font-medium text-slate-900">
                      <InrAmount amount={salaryBreakup.ltaMonthly} />
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Special Allowance</span>
                    <span className="font-medium text-slate-900">
                      <InrAmount amount={salaryBreakup.specialAllowance} />
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Employer PF (12%)</span>
                    <span className="font-medium text-slate-900">
                      <InrAmount amount={salaryBreakup.employerPfMonthly} />
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Gratuity (4.81%)</span>
                    <span className="font-medium text-slate-900">
                      <InrAmount amount={salaryBreakup.gratuityMonthly} />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-start gap-3">
            <Info className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold">Notice regarding salary changes:</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Compensation cannot be edited directly here to preserve full statutory audit compliance (SCD Type 2).
                To revise this employee's salary, please save any demographic changes first and use the{' '}
                <Link
                  to={`/salary-revision/${id}`}
                  className="font-bold underline hover:text-amber-900"
                >
                  Revise Salary
                </Link>{' '}
                action.
              </p>
            </div>
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Link
            to={isEditMode ? `/employees/${id}` : '/employees'}
            className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isEditMode ? 'Update Employee' : 'Create Employee'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
