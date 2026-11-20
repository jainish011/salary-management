export * from './auth.js';

export interface Department {
  id: string;
  name: string;
  description?: string;
  headcount?: number;
  avgMonthlyCtc?: number;
  totalMonthlyCtc?: number;
}

export type EmploymentStatus = 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';
export type TaxRegime = 'NEW' | 'OLD';

export interface SalaryStructure {
  id: string;
  employeeId: string;
  annualCtc: number;
  monthlyCtc: number;
  basicMonthly: number;
  hraMonthly: number;
  ltaMonthly: number;
  specialAllowance: number;
  otherAllowances: number;
  employerPfMonthly: number;
  gratuityMonthly: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  revisionReason?: string;
  remarks?: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfJoining: string;
  dateOfLeaving: string | null;
  designation: string;
  grade: string;
  employmentStatus: EmploymentStatus;
  workCity: string;
  workState: string;
  taxRegime: TaxRegime;
  panNumber: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  departmentId: string;
  department?: Department;
  currentSalary?: SalaryStructure | null;
  createdAt: string;
}

export type PayrollPeriodStatus = 'OPEN' | 'PROCESSING' | 'LOCKED';

export interface PayrollPeriod {
  id: string;
  periodName: string;
  fiscalYear: string;
  month: number;
  year: number;
  startDate: string;
  endDate: string;
  payDate: string | null;
  status: PayrollPeriodStatus;
  totalEmployees: number | null;
  totalGross: number | null;
  totalNet: number | null;
  totalPf: number | null;
  totalTds: number | null;
  runAt: string | null;
  lockedAt: string | null;
}

export interface PayslipItem {
  id: string;
  itemType: 'EARNING' | 'DEDUCTION' | 'EMPLOYER_CONTRIB';
  itemName: string;
  amount: number;
  sortOrder: number;
}

export interface Payslip {
  id: string;
  employeeId: string;
  periodId: string;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  employeePf: number;
  employeeEsi: number;
  professionalTax: number;
  tds: number;
  employerPf: number;
  gratuityProv: number;
  monthlyCtc: number;
  employee?: Employee;
  period?: PayrollPeriod;
  salaryStructure?: SalaryStructure;
  items?: PayslipItem[];
  createdAt: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
