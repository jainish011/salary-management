# ACME Salary Management — Task Tracker

> All tasks are derived from `SYSTEM_DESIGN.md`. Execute them in order — each phase depends on the previous one being complete. Check off tasks as they are done.

---

## Legend
- `[ ]` — Not started
- `[x]` — Complete
- `[~]` — In progress

---

## Phase 0 — Project Setup & Infrastructure

### 0.1 Repository & Tooling
- [x] Initialize Git repository with `.gitignore` (node_modules, dist, .env)
- [x] Create monorepo root with `backend/` and `frontend/` folders
- [x] Add root `README.md` with project overview and local setup instructions

### 0.2 Docker Infrastructure
- [x] Create `docker-compose.yml` with:
  - PostgreSQL 16 service (port 5432, persistent volume)
  - Redis 7 service (port 6379)
  - Environment variables via `.env` file
- [x] Create `.env.example` with all required env vars documented
- [x] Verify database service (PostgreSQL 18 running on port 5432 with `acme_salary` created)

### 0.3 Backend Project Init (NestJS)
- [x] Scaffold NestJS project inside `backend/` using NestJS CLI
- [x] Install core dependencies:
  - `@nestjs/typeorm`, `typeorm`, `pg` — ORM + DB driver
  - `@nestjs/config` — env config
  - `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt` — auth
  - `bcrypt`, `@types/bcrypt`
  - `class-validator`, `class-transformer` — DTO validation
  - `ioredis`, `@nestjs/cache-manager`, `cache-manager` — Redis cache
  - `@faker-js/faker` — seed data
- [x] Configure TypeORM in `app.module.ts` with PostgreSQL connection + connection pool (max: 20, min: 5)
- [x] Configure `ConfigModule` to load `.env`
- [x] Verify app builds without errors: `npm run build`

### 0.4 Frontend Project Init (React + Vite)
- [x] Scaffold React + TypeScript project inside `frontend/` using Vite
- [x] Install core dependencies:
  - `@tailwindcss/postcss`, `postcss`, `autoprefixer`
  - `@tanstack/react-query` — server state
  - `@tanstack/react-table` — table with server pagination
  - `axios` — HTTP client
  - `react-router-dom` — routing
  - `recharts` — charts
  - `react-hook-form`, `zod`, `@hookform/resolvers` — form handling
  - `lucide-react` — icons
  - `date-fns` — date formatting
  - `clsx`, `tailwind-merge`
- [x] Configure Tailwind CSS
- [x] Verify frontend builds without errors: `npm run build`

---

## Phase 1 — Database Schema & Migrations

### 1.1 TypeORM Entities
- [x] Create `User` entity (`users` table) with all columns as per design
- [x] Create `Department` entity (`departments` table)
- [x] Create `Employee` entity (`employees` table) with:
  - All columns (employeeCode, firstName, lastName, email, gender, panNumber, uanNumber, dateOfJoining, dateOfLeaving, employmentStatus, employmentType, designation, grade, workCity, workState, taxRegime)
  - `@ManyToOne` relation to `Department`
  - `@OneToMany` relation to `SalaryStructure`
  - Composite `@Index` on `[departmentId, employmentStatus, grade]`
  - `@Index` on `workState`, `workCity`
- [x] Create `SalaryStructure` entity (`salary_structures` table) with:
  - All CTC columns using `type: 'numeric', precision: X, scale: 2`
  - `effectiveFrom` and `effectiveTo` date columns
  - `@ManyToOne` back-relation to `Employee`
  - `@Index` on `[employeeId, effectiveFrom]`
- [x] Create `PayrollPeriod` entity (`payroll_periods` table) with status enum lifecycle
- [x] Create `Payslip` entity (`payslips` table) with `UNIQUE` constraint on `[employeeId, periodId]`
- [x] Create `PayslipItem` entity (`payslip_items` table) with `ON DELETE CASCADE`
- [x] Create `AuditLog` entity (`audit_logs` table) with `BIGSERIAL` PK and JSONB columns

### 1.2 TypeORM Migrations & Indexing
- [x] Generated database schema with all entities synchronized
- [x] Added all indexes defined in Section 6 of `SYSTEM_DESIGN.md`:
  - `idx_emp_dept_status_grade` (composite)
  - `idx_emp_fulltext` (GIN full-text search)
  - `idx_emp_state`, `idx_emp_city`
  - `idx_sal_emp_effective`, `idx_sal_active` (partial index WHERE NULL)
  - `idx_payslip_period`, `idx_payslip_employee`, `idx_payslip_period_emp`
  - `idx_items_payslip`
  - `idx_period_status`, `idx_period_date`
  - `idx_audit_entity`, `idx_audit_created`, `idx_audit_user`
- [x] Verify all tables and indexes exist in PostgreSQL (26 indexes, 8 tables)

### 1.3 Seed Script
- [x] Create `database/seeds/seed.ts` as a standalone NestJS script
- [x] Seed departments (10 departments: Engineering, Product, Design, Finance, HR, Sales, Marketing, Operations, Legal, Customer Success)
- [x] Seed 1 default HR Admin user (email: `admin@acme.com`, password: `Admin@123`)
- [x] Seed 10,000 employees using `@faker-js/faker` with Indian locale:
  - Realistic Indian first/last names
  - Indian cities: Mumbai, Bangalore, Delhi, Hyderabad, Pune, Chennai, Kolkata, Ahmedabad
  - States mapped to cities (Bangalore → Karnataka, Mumbai → Maharashtra, etc.)
  - Grades distributed: L1 (20%), L2 (30%), L3 (25%), L4 (15%), L5 (7%), L6 (3%)
  - CTC ranges per grade (L1: ₹2.4L–4.8L, L2: ₹4.8L–9.6L, etc.)
  - Tax regime: 70% NEW, 30% OLD
  - Employment status: 90% ACTIVE, 5% ON_LEAVE, 5% TERMINATED
  - Date of joining: random between 2017–2025
  - Fake PAN format (ABCDE1234F), UAN (12-digit number)
- [x] For each employee, create initial `SalaryStructure` record with:
  - `effectiveFrom = dateOfJoining`
  - `effectiveTo = NULL`
  - Auto-computed Basic (40% monthly CTC), HRA (metro: 50% Basic, non-metro: 40% Basic), Special Allowance (balancing), Employer PF (12% Basic), Gratuity (4.81% Basic)
- [x] For 30% of employees, add 1–2 additional salary revision records (simulating past increments)
- [x] Run seed and verify counts: `SELECT COUNT(*) FROM employees;` → 10,000; `salary_structures` → 13,006
- [x] Add `npm run seed` script to `package.json`

---

## Phase 2 — Backend: Auth Module

### 2.1 Auth Entities & Service
- [ ] Create `AuthModule`, `AuthController`, `AuthService`
- [ ] Implement `POST /auth/login`:
  - Accept `{ email, password }`
  - Validate against `users` table with bcrypt compare
  - Return signed JWT `{ access_token, user: { id, email, fullName, role } }`
- [ ] Implement `GET /auth/me` — returns current user from JWT
- [ ] Implement `POST /auth/logout` — client-side token drop (stateless JWT)
- [ ] Create `JwtAuthGuard` using `@nestjs/passport`
- [ ] Create `CurrentUser` decorator to extract user from JWT payload
- [ ] Apply `JwtAuthGuard` globally (all routes except `/auth/login`)
- [ ] Write unit tests for `AuthService` (login success, wrong password, user not found)

---

## Phase 3 — Backend: Departments Module

### 3.1 Department CRUD
- [ ] Create `DepartmentsModule`, `DepartmentsController`, `DepartmentsService`
- [ ] Implement `GET /departments` — returns all departments (no pagination, cached in Redis for 30 min)
- [ ] Implement `POST /departments` — create with name + description, validate unique name
- [ ] Implement `PATCH /departments/:id` — update name/description, invalidate cache
- [ ] Create `CreateDepartmentDto` and `UpdateDepartmentDto` with class-validator
- [ ] Write unit tests for `DepartmentsService`

---

## Phase 4 — Backend: Employees Module

### 4.1 Employee CRUD
- [ ] Create `EmployeesModule`, `EmployeesController`, `EmployeesService`
- [ ] Implement `POST /employees` — create employee:
  - Validate DTO (required fields, email uniqueness)
  - Auto-generate `employeeCode` (EMP + zero-padded sequence)
  - Also create initial `SalaryStructure` record from CTC input
  - Log to `audit_logs` (action: CREATE)
- [ ] Implement `GET /employees/:id` — employee detail with current salary:
  - Join with department
  - Join salary_structures WHERE effectiveTo IS NULL (using partial index)
  - Return full profile + currentSalary object
- [ ] Implement `PATCH /employees/:id` — update personal/employment fields:
  - Validate DTO
  - Log changed fields to `audit_logs`
- [ ] Implement `DELETE /employees/:id` — soft delete:
  - Set `employmentStatus = TERMINATED`, `dateOfLeaving = today`
  - Log to `audit_logs`

### 4.2 Employee List with Pagination & Filters
- [ ] Implement `GET /employees` with full filter + pagination support:
  - Query builder with optional WHERE clauses for: `departmentId`, `grade`, `employmentStatus`, `workCity`, `workState`
  - Full-text search on `search` param using GIN index (`to_tsquery`)
  - CTC range filter via JOIN to current salary structure
  - `sortBy` / `order` support
  - `LIMIT/OFFSET` pagination
  - Return `{ data: [...], meta: { total, page, limit, totalPages } }`
- [ ] Cache filtered list results in Redis (key: MD5 hash of query params, TTL: 2 min)

### 4.3 Salary History & Revisions
- [ ] Implement `GET /employees/:id/salary-history` — paginated list of all SalaryStructure records for employee, ordered by effectiveFrom DESC
- [ ] Create `SalaryStructuresModule`, `SalaryStructuresController`, `SalaryStructuresService`
- [ ] Implement `POST /salary-structures` — salary revision:
  - Validate: employee exists, effectiveFrom is valid date
  - Close current active record: set `effectiveTo = effectiveFrom - 1 day`
  - Compute new salary breakdown from annual CTC:
    - `basicMonthly = annualCtc / 12 * 0.40`
    - `hraMonthly = basicMonthly * (metro city ? 0.50 : 0.40)`
    - `ltaMonthly = annualCtc / 12 * 0.0167`
    - `specialAllowance = monthlyCtc - basic - hra - lta - employerPf - gratuity`
    - `employerPfMonthly = min(basicMonthly, 15000) * 0.12`
    - `gratuityMonthly = basicMonthly * 0.0481`
  - Insert new SalaryStructure record
  - Invalidate Redis caches: `dashboard:kpis`, `reports:*`
  - Log to `audit_logs`
- [ ] Implement `GET /salary-structures/:id` — single record detail

### 4.4 Employee Payslip History
- [ ] Implement `GET /employees/:id/payslips` — paginated list of payslips for employee (from payslips table, ordered by period descending)

### 4.5 Employee Unit Tests
- [ ] Unit test: `EmployeesService.create()` — validates DTO, creates employee + salary structure
- [ ] Unit test: `EmployeesService.findAll()` — pagination math, filter logic
- [ ] Unit test: `SalaryStructuresService.createRevision()` — SCD2 close + new record
- [ ] Unit test: salary breakdown computation (Basic, HRA, Special Allow for given CTC)

---

## Phase 5 — Backend: Payroll Calculation Engine

### 5.1 Core Calculation Engine
- [ ] Create `PayrollCalculationService` as a standalone injectable service
- [ ] Implement `calculateProfessionalTax(state, gender, grossMonthly, month)`:
  - Maharashtra slabs (male/female distinction, February ₹300)
  - Karnataka slabs (February ₹300)
  - Tamil Nadu slabs
  - Delhi, Haryana, UP → ₹0
  - Default fallback
- [ ] Implement `calculateTaxNewRegime(annualCtc)`:
  - Standard deduction ₹75,000
  - Slab rates: 0% / 5% / 10% / 15% / 20% / 30%
  - Section 87A rebate (zero tax if taxable ≤ ₹7L)
  - 4% Health & Education Cess
- [ ] Implement `calculateTaxOldRegime(annualCtc, basicMonthly, hraMonthly, workCity)`:
  - Standard deduction ₹50,000
  - HRA exemption: `min(actualHRA, rent paid - 10% basic, 50%/40% of basic)`
  - 80C deduction assumption: ₹1,50,000
  - Slab rates: 0% / 5% / 20% / 30%
  - Section 87A rebate (zero tax if taxable ≤ ₹5L)
  - 4% cess
- [ ] Implement `calculateForEmployee(employee, salaryStructure, payrollPeriod)`:
  - Gross = Basic + HRA + LTA + Special Allow
  - Employee PF = 12% of min(Basic, ₹15,000)
  - Employer PF = same as employee PF
  - Employee ESI = 0.75% of Gross (if Gross ≤ ₹21,000, else 0)
  - Employer ESI = 3.25% of Gross (if applicable)
  - PT = from `calculateProfessionalTax()`
  - TDS = from regime-based calculation / 12
  - Gratuity provision = Basic × 0.0481
  - Net Pay = Gross − (Employee PF + ESI + PT + TDS)
  - Return full `PayslipCalculationResult` with itemized line items
- [ ] Implement `buildLineItems(result)` — creates ordered `PayslipItem[]` with sort_order

### 5.2 Payroll Calculation Unit Tests (Critical)
- [ ] Test: PT = ₹0 for employee in Delhi (any salary)
- [ ] Test: PT = ₹200 for Karnataka employee earning ₹30,000 in March
- [ ] Test: PT = ₹300 for Karnataka employee earning ₹30,000 in February
- [ ] Test: PT = ₹0 for Maharashtra female employee earning ₹20,000
- [ ] Test: PT = ₹175 for Maharashtra male employee earning ₹9,000
- [ ] Test: TDS = ₹0 for New Regime employee with annual CTC ₹7,00,000 (87A rebate applies)
- [ ] Test: TDS correct for New Regime employee with annual CTC ₹10,00,000
- [ ] Test: TDS correct for Old Regime employee with annual CTC ₹10,00,000
- [ ] Test: ESI deducted for employee with Gross ₹18,000
- [ ] Test: ESI = ₹0 for employee with Gross ₹25,000
- [ ] Test: PF capped at ₹15,000 Basic wage ceiling
- [ ] Test: Net Pay = Gross − all deductions (end-to-end calculation)
- [ ] Test: Payslip line items count and sort order correct

---

## Phase 6 — Backend: Payroll Periods Module

### 6.1 Payroll Period CRUD
- [ ] Create `PayrollModule`, `PayrollController`, `PayrollService`
- [ ] Implement `GET /payroll-periods` — paginated list (page, limit), ordered by year DESC, month DESC
- [ ] Implement `POST /payroll-periods` — open a new period:
  - Validate no existing OPEN period for same month/year
  - Auto-set `fiscalYear` (e.g., Nov 2026 → "2026-27")
  - Status defaults to `OPEN`
  - Log to `audit_logs`
- [ ] Implement `GET /payroll-periods/:id` — period detail + summary stats
- [ ] Implement `GET /payroll-periods/:id/payslips` — paginated payslips for period with search + departmentId filter

### 6.2 Payroll Run
- [ ] Implement `POST /payroll-periods/:id/run`:
  - Guard: period must be in OPEN status (reject if LOCKED)
  - Guard: cannot re-run if payslips already exist for this period
  - Set period status to `PROCESSING`
  - Fetch all ACTIVE employees with their active salary structure (WHERE effectiveTo IS NULL)
  - Process in batches of 500 using `PayrollCalculationService`
  - Bulk insert all `Payslip` records in a single transaction
  - Bulk insert all `PayslipItem` records
  - Update `PayrollPeriod` summary (totalEmployees, totalGross, totalNet, totalPf, totalTds, runAt)
  - Set period back to `OPEN` status (HR can review before locking)
  - Invalidate Redis cache: `dashboard:kpis`, `reports:*`
  - Log payroll run event to `audit_logs`
  - Return run summary (totalEmployees, totalGross, totalNet, durationMs)
- [ ] Implement `POST /payroll-periods/:id/lock`:
  - Guard: period must be OPEN and must have been run (runAt != null)
  - Set status to `LOCKED`, set `lockedAt`
  - Log to `audit_logs`

### 6.3 Payslip API
- [ ] Create `PayslipsController`
- [ ] Implement `GET /payslips/:id` — full payslip with line items, employee info, period info

### 6.4 Payroll Unit Tests
- [ ] Test: `PayrollService.run()` — processes correct number of employees
- [ ] Test: `PayrollService.run()` — throws if period is LOCKED
- [ ] Test: `PayrollService.lock()` — throws if period not yet run
- [ ] Test: `PayrollService.lock()` — succeeds and sets lockedAt
- [ ] Integration test: run payroll for 10 test employees, verify payslip records created with correct net pay

---

## Phase 7 — Backend: Reports Module

### 7.1 Analytics Endpoints
- [ ] Create `ReportsModule`, `ReportsController`, `ReportsService`
- [ ] Implement `GET /reports/dashboard` (cached 10 min):
  - `totalActiveEmployees` — COUNT WHERE status = ACTIVE
  - `totalMonthlyPayroll` — SUM of net_pay from latest LOCKED period
  - `currentPeriod` — latest payroll period name + status
  - `recentRevisions` — last 5 salary revision events from audit_logs
- [ ] Implement `GET /reports/department-summary` (cached 15 min):
  - Per department: headcount, avgMonthlyCTC, totalMonthlyCTC
  - JOIN employees + salary_structures WHERE effectiveTo IS NULL
  - GROUP BY department
- [ ] Implement `GET /reports/salary-distribution` (cached 15 min):
  - Histogram of employees by annual CTC band: <3L, 3–6L, 6–10L, 10–15L, 15–25L, 25L+
  - Return band label + count
- [ ] Implement `GET /reports/payroll-trend?months=6`:
  - Last N locked payroll periods
  - Return array of `{ periodName, totalNet, totalGross, month, year }`
- [ ] Implement `GET /reports/grade-summary` (cached 15 min):
  - Per grade: count, minCTC, avgCTC, maxCTC
- [ ] Implement `GET /reports/headcount-by-city`:
  - GROUP BY workCity for ACTIVE employees only
  - Return `{ city, count }`[]
- [ ] Implement `GET /reports/export?format=csv` — stream CSV of active employees + current salary

### 7.2 Audit Logs Endpoint
- [ ] Create `AuditModule`, `AuditController`
- [ ] Implement `GET /audit-logs` with pagination + filters:
  - `entityType`, `entityId`, `changedBy`, `from` (date), `to` (date)
  - Return paginated list with standard meta

### 7.3 Audit Interceptor
- [ ] Create `AuditInterceptor` as a NestJS `NestInterceptor`
- [ ] Implement `@AuditLog(entityType, action)` decorator
- [ ] Interceptor captures: before/after state from service, userId from JWT, IP from request
- [ ] Apply decorator to: employee create/update/delete, salary revision, payroll run, period lock

---

## Phase 8 — Backend: Caching Layer

### 8.1 Redis Cache Setup
- [ ] Configure Redis connection in `app.module.ts` using `cache-manager` with ioredis store
- [ ] Create `CacheService` wrapper with typed `get`, `set`, `del`, `delPattern` methods
- [ ] Implement cache read-through pattern in `ReportsService` and `DepartmentsService`
- [ ] Implement cache invalidation calls in:
  - `EmployeesService.create()` → delete `dashboard:kpis`
  - `SalaryStructuresService.createRevision()` → delete `dashboard:kpis`, `reports:*`
  - `DepartmentsService.create/update()` → delete `departments:all`
  - `PayrollService.run()` → delete `dashboard:kpis`, `reports:*`
- [ ] Verify cache is working with Redis CLI (`KEYS *` after first request)

---

## Phase 9 — Frontend: Foundation & Layout

### 9.1 App Shell
- [ ] Create `AppLayout` component: collapsible sidebar + top bar
- [ ] Sidebar links: Dashboard, Employees, Payroll, Reports, Departments, Audit Logs
- [ ] Top bar: app name, logged-in user display, logout button
- [ ] Create `AuthLayout` for the login page (no sidebar)
- [ ] Set up React Router routes:
  - `/login` → LoginPage
  - `/` → redirect to `/dashboard`
  - `/dashboard` → DashboardPage (protected)
  - `/employees` → EmployeeListPage (protected)
  - `/employees/new` → EmployeeFormPage (protected)
  - `/employees/:id` → EmployeeDetailPage (protected)
  - `/employees/:id/edit` → EmployeeFormPage (protected)
  - `/salary-revision/:employeeId` → SalaryRevisionPage (protected)
  - `/payroll` → PayrollListPage (protected)
  - `/payroll/:periodId` → PayrollDetailPage (protected)
  - `/payslip/:payslipId` → PayslipViewPage (protected)
  - `/reports` → ReportsPage (protected)
  - `/departments` → DepartmentsPage (protected)
  - `/audit-logs` → AuditLogsPage (protected)

### 9.2 Auth & API Client
- [ ] Create `api/client.ts` — Axios instance with base URL, JWT auth header interceptor
- [ ] Create `api/auth.ts` — login, logout, getMe API calls
- [ ] Create `AuthContext` with `user`, `login()`, `logout()` methods
- [ ] Create `ProtectedRoute` component — redirects to `/login` if not authenticated
- [ ] Store JWT token in memory (not localStorage for security)
- [ ] Implement global error interceptor: 401 → redirect to login

### 9.3 Shared Components
- [ ] Create `PageHeader` component (title + optional action button)
- [ ] Create `DataTable` component wrapping TanStack Table with:
  - Server-side pagination controls (Prev/Next, page numbers, total count)
  - Column sorting
  - Loading skeleton state
  - Empty state
- [ ] Create `StatusBadge` component (Active/On Leave/Terminated with colors)
- [ ] Create `InrAmount` component (formats number as ₹1,20,000)
- [ ] Create `ConfirmDialog` component (shadcn AlertDialog wrapper)
- [ ] Create `LoadingSpinner` component
- [ ] Create `ErrorMessage` component

---

## Phase 10 — Frontend: Login Page

- [ ] Build `LoginPage` with ACME Payroll branding
- [ ] Form: email + password inputs with validation (react-hook-form + zod)
- [ ] Show error message on invalid credentials
- [ ] On success: store token, redirect to `/dashboard`
- [ ] Show loading state on submit button

---

## Phase 11 — Frontend: Dashboard Page

- [ ] Create `api/reports.ts` — dashboard KPIs, department summary, salary distribution, audit log fetching functions
- [ ] Build `DashboardPage`:
  - [ ] Summary strip: 4 KPI cards (Active Employees, Monthly Payroll, Current Period, Pending Actions)
  - [ ] Payroll cost by department — Recharts `BarChart` (horizontal)
  - [ ] Headcount by department — Recharts `BarChart`
  - [ ] Salary distribution by CTC band — Recharts `BarChart` (histogram)
  - [ ] Recent activity feed — last 5 audit log entries with action descriptions
  - [ ] Quick action buttons: Add Employee, Open New Period
- [ ] Use TanStack Query with `staleTime: 5 * 60 * 1000` for dashboard data
- [ ] Show loading skeletons while data fetches

---

## Phase 12 — Frontend: Employees Pages

### 12.1 Employee List Page
- [ ] Create `api/employees.ts` — all employee API calls
- [ ] Build `EmployeeListPage`:
  - [ ] Search input with 300ms debounce (updates URL query params)
  - [ ] Filter bar: Department dropdown, City input, Grade select, Status select, CTC range inputs
  - [ ] "Clear Filters" button resets all filters
  - [ ] `DataTable` with columns: Emp Code, Name, Department, Grade, City, Monthly CTC, Status, Actions
  - [ ] Row click navigates to `/employees/:id`
  - [ ] Column sorting on Name, Grade, Monthly CTC
  - [ ] Server-side pagination (20 per page)
  - [ ] "+ Add Employee" button → `/employees/new`
  - [ ] All filter state synced to URL query params (shareable links)

### 12.2 Employee Detail Page
- [ ] Build `EmployeeDetailPage`:
  - [ ] Profile card: all personal + employment fields
  - [ ] Current Salary card: monthly CTC breakdown (Basic, HRA, LTA, Special Allow, Employer PF, Gratuity)
  - [ ] Current Month Estimate card: Gross, deductions, Net Take-Home (computed client-side from current salary)
  - [ ] Salary History table: all revisions with effective dates, CTC, reason, % change
  - [ ] "+ Revise Salary" button → `/salary-revision/:id`
  - [ ] Payslip history: last 6 payslips as cards with period, net pay, link to full payslip
  - [ ] Edit and soft-delete (terminate) actions in header

### 12.3 Employee Form Page (Add / Edit)
- [ ] Build `EmployeeFormPage` (shared for create and edit):
  - [ ] Section 1 — Personal Info: firstName, lastName, email, dateOfBirth, gender, panNumber
  - [ ] Section 2 — Employment Info: dateOfJoining, department (dropdown), designation, grade (select), employmentType (select), workCity (select), workState (auto-fills from city map)
  - [ ] Section 3 — Salary Info: annualCtc input → live-preview of Basic, HRA, Special Allow, Employer PF, Gratuity breakdown
  - [ ] Section 4 — Tax Info: taxRegime (select), uanNumber
  - [ ] Form validation with Zod schema
  - [ ] On success: navigate to employee detail page
  - [ ] On edit: pre-fill form with existing data

### 12.4 Salary Revision Page
- [ ] Build `SalaryRevisionPage`:
  - [ ] Show current CTC + Basic for context
  - [ ] New Annual CTC input → live-preview new breakdown
  - [ ] Effective From date picker
  - [ ] Revision Reason select (PROMOTION, APPRAISAL, CORRECTION, MARKET_CORRECTION)
  - [ ] Remarks textarea
  - [ ] On success: navigate back to employee detail

---

## Phase 13 — Frontend: Payroll Pages

### 13.1 Payroll List Page
- [ ] Create `api/payroll.ts` — all payroll API calls
- [ ] Build `PayrollListPage`:
  - [ ] Table: Period Name, Employees Count, Total Net Pay, Status badge, Actions
  - [ ] Status: OPEN (yellow/amber), LOCKED (red/locked icon)
  - [ ] Actions: "Run & View" for OPEN, "View" for LOCKED
  - [ ] "+ Open New Period" button → modal/dialog with month+year picker
  - [ ] Server-side pagination (10 per page)

### 13.2 Payroll Detail Page
- [ ] Build `PayrollDetailPage`:
  - [ ] Period header: name, dates, status badge
  - [ ] Summary strip (shown after payroll run): Employees Processed, Total Gross, Total Net, Total PF, Total TDS
  - [ ] Action bar:
    - If OPEN + not run: "▶ Run Payroll" button (with confirm dialog)
    - If OPEN + run: "▶ Re-run Payroll" + "🔒 Lock Period" buttons
    - If LOCKED: read-only banner
  - [ ] Run payroll loading state (progress indicator while API call runs)
  - [ ] Payslips table: Emp ID, Name, Gross, Deductions, Net Pay, Actions (View Payslip)
  - [ ] Search + Department filter on payslips table
  - [ ] Server-side pagination (20 per page)

### 13.3 Payslip View Page
- [ ] Build `PayslipViewPage`:
  - [ ] Styled payslip document layout (matches Indian payslip format from design doc)
  - [ ] Header: Company name, payslip month, employee details (name, ID, PAN, UAN, designation, dept, location, tax regime)
  - [ ] Two-column layout: Earnings (left) | Deductions (right)
  - [ ] Line items from `payslip_items` ordered by sort_order
  - [ ] Footer: Gross, Total Deductions, Net Pay (highlighted)
  - [ ] Employer contributions section below (Employer PF, Gratuity, Monthly CTC)
  - [ ] "🖨 Print" button (triggers `window.print()`)

---

## Phase 14 — Frontend: Reports Page

- [ ] Build `ReportsPage`:
  - [ ] Salary By Department — Recharts `BarChart` (dept vs avg CTC)
  - [ ] Salary Distribution — Recharts `BarChart` (CTC band histogram)
  - [ ] Payroll Trend — Recharts `LineChart` (last 6 months total net pay)
  - [ ] Headcount by City — Recharts `BarChart` (horizontal)
  - [ ] Grade Summary — DataTable (grade, count, min/avg/max CTC)
  - [ ] Export CSV button (calls `/reports/export` and triggers download)
  - [ ] Filters: Period (for trend), Department, City

---

## Phase 15 — Frontend: Departments & Audit Logs Pages

### 15.1 Departments Page
- [ ] Build `DepartmentsPage`:
  - [ ] Table: Department Name, Headcount, Avg Monthly CTC, Actions (Edit)
  - [ ] "+ Add Department" button → inline form or dialog
  - [ ] Edit department name/description in dialog
  - [ ] No pagination (< 100 items)

### 15.2 Audit Logs Page
- [ ] Build `AuditLogsPage`:
  - [ ] Filters: Entity Type select, From date, To date, Changed By input
  - [ ] Table: Timestamp, Action (human-readable), Changed By, Entity (clickable link to employee/period)
  - [ ] Server-side pagination (20 per page)
  - [ ] Read-only — no edit actions

---

## Phase 16 — Testing

### 16.1 Backend Unit Tests
- [ ] All payroll calculation tests from Phase 5.2 pass
- [ ] `AuthService` unit tests (login, wrong password)
- [ ] `EmployeesService` unit tests (create, findAll, softDelete)
- [ ] `SalaryStructuresService` unit tests (SCD2 revision, CTC breakdown computation)
- [ ] `PayrollService` unit tests (run guard, lock guard)
- [ ] `DepartmentsService` unit tests (CRUD)
- [ ] `ReportsService` unit tests (verify correct SQL aggregation results)
- [ ] Run all: `npm run test` → 100% pass

### 16.2 Backend E2E Tests
- [ ] E2E: Login → get JWT → call protected route
- [ ] E2E: Create employee → verify in DB → get employee → verify response shape
- [ ] E2E: Create salary revision → verify old record closed, new record active
- [ ] E2E: Open payroll period → run payroll → verify 10 test employees have payslips → lock period → verify locked
- [ ] Run all: `npm run test:e2e` → pass

### 16.3 Frontend Tests (Optional Bonus)
- [ ] Component test: `InrAmount` renders ₹1,20,000 for input 120000
- [ ] Component test: `StatusBadge` renders correct color for each status
- [ ] Hook test: pagination logic in `useEmployees` hook

---

## Phase 17 — Polish & Documentation

### 17.1 Error Handling
- [ ] Backend: Global NestJS exception filter — format all errors as `{ statusCode, message, errors }`
- [ ] Backend: Handle TypeORM unique constraint violation → 409 Conflict with helpful message
- [ ] Frontend: Toast notifications for all API errors (using shadcn `toast`)
- [ ] Frontend: Empty states on all list pages (no data illustration + action button)
- [ ] Frontend: 404 page

### 17.2 UX Polish
- [ ] Add loading skeletons on all data-fetching pages
- [ ] Add optimistic updates where appropriate (e.g., employee status badge updates instantly)
- [ ] INR formatting: all currency values display as `₹X,XX,XXX` (Indian number format with lakhs)
- [ ] Date formatting: all dates as `DD MMM YYYY` (e.g., 01 Apr 2021)
- [ ] Confirm dialogs on destructive actions (terminate employee, run payroll, lock period)
- [ ] Responsive layout (sidebar collapses on smaller screens)

### 17.3 Documentation
- [ ] Update `README.md` with:
  - Project overview (1 paragraph)
  - Tech stack summary
  - Prerequisites (Node.js 20+, Docker)
  - Local setup: `docker-compose up`, `npm install`, `npm run migrate`, `npm run seed`, `npm run start:dev`
  - Default login credentials
  - Link to `SYSTEM_DESIGN.md`
- [ ] Add `SYSTEM_DESIGN.md` to repo (already created)
- [ ] Git commit history shows incremental progress (one commit per meaningful feature/phase)

---

## Phase 18 — Final Verification

- [ ] Run full seed: 10,000 employees seeded successfully
- [ ] Open a payroll period for current month
- [ ] Run payroll → all 10,000 employees get payslips
- [ ] Lock the period → verify immutability
- [ ] Dashboard shows correct KPIs
- [ ] All report charts render with real data
- [ ] Export CSV downloads correctly
- [ ] Audit logs show all actions taken
- [ ] All unit tests pass: `npm run test`
- [ ] All E2E tests pass: `npm run test:e2e`
- [ ] No console errors in browser
- [ ] Final Git commit with all changes

---

## Task Summary

| Phase | Description | Est. Tasks |
|---|---|---|
| 0 | Project Setup & Infrastructure | 14 |
| 1 | Database Schema & Migrations | 20 |
| 2 | Auth Module | 8 |
| 3 | Departments Module | 6 |
| 4 | Employees Module | 16 |
| 5 | Payroll Calculation Engine | 15 |
| 6 | Payroll Periods Module | 12 |
| 7 | Reports & Audit Modules | 14 |
| 8 | Caching Layer | 6 |
| 9 | Frontend Foundation & Layout | 18 |
| 10 | Login Page | 4 |
| 11 | Dashboard Page | 8 |
| 12 | Employees Pages | 20 |
| 13 | Payroll Pages | 14 |
| 14 | Reports Page | 8 |
| 15 | Departments & Audit Pages | 8 |
| 16 | Testing | 16 |
| 17 | Polish & Documentation | 12 |
| 18 | Final Verification | 10 |
| **Total** | | **~219 tasks** |
