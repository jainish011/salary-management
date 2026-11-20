# ACME Salary Management System — Complete System Design Plan

> [!IMPORTANT]
> This document is the single source of truth for the full system design — covering UI, APIs, Database, Caching, Indexing, and Architecture decisions. India-specific payroll standards (CTC, PF, ESI, PT, TDS) are built into the core.

---

## Table of Contents
1. [High-Level Architecture](#1-high-level-architecture)
2. [Technology Stack](#2-technology-stack)
3. [UI Pages & Use Cases](#3-ui-pages--use-cases)
4. [Database Schema](#4-database-schema)
5. [TypeORM Entity Definitions](#5-typeorm-entity-definitions)
6. [Indexing Strategy](#6-indexing-strategy)
7. [Caching Strategy](#7-caching-strategy)
8. [API Design](#8-api-design)
9. [Payroll Calculation Engine (LLD)](#9-payroll-calculation-engine-lld)
10. [System Design Concepts Applied](#10-system-design-concepts-applied)
11. [What We're Deliberately Leaving Out](#11-what-were-deliberately-leaving-out)

---

## 1. High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        BROWSER (React + TypeScript)                    │
│   Dashboard | Employees | Payroll | Reports | Departments | Audit       │
└──────────────────────────┬─────────────────────────────────────────────┘
                           │ HTTPS / REST (JSON)
                           ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    NestJS API Server (Node.js)                          │
│                                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │Auth      │  │Employees │  │Payroll   │  │Reports   │  │Audit    │ │
│  │Module    │  │Module    │  │Module    │  │Module    │  │Module   │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │            Payroll Calculation Engine (Core Business Logic)        ││
│  └────────────────────────────────────────────────────────────────────┘│
└───────────────┬────────────────────────────┬───────────────────────────┘
                │                            │
     ┌──────────▼──────────┐    ┌────────────▼────────────┐
     │   PostgreSQL DB      │    │   Redis Cache            │
     │   (TypeORM)          │    │   (Hot data, KPIs,       │
     │   Primary store      │    │    dept lists, sessions) │
     └─────────────────────┘    └─────────────────────────┘
```

### Request Lifecycle
```
Browser → NestJS Guard (JWT Auth) → Controller → Service → 
  → Check Redis Cache (hit? return) → TypeORM Repository → PostgreSQL
  → Cache result → Return response
```

---

## 2. Technology Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | React 18 + TypeScript + Vite | Fast builds, type safety, modern ecosystem |
| **UI Library** | shadcn/ui + Tailwind CSS | Composable, unstyled base, easy theming |
| **State / Fetching** | TanStack Query (React Query) | Caching, pagination, background refresh built-in |
| **Charts** | Recharts | Lightweight, good React integration |
| **Tables** | TanStack Table | Server-side pagination/sorting out of the box |
| **Backend** | NestJS (Node.js + TypeScript) | Modular, DI container, decorators, works perfectly with TypeORM |
| **ORM** | TypeORM | Decorator-based entities, migrations, relations — fits NestJS natively |
| **Database** | PostgreSQL 16 | ACID, `NUMERIC` type for money, robust indexing |
| **Cache** | Redis 7 | In-memory KV store for hot reads |
| **Auth** | JWT (access token) + bcrypt | Stateless, standard |
| **Validation** | class-validator + class-transformer | NestJS-native DTO validation |
| **Seed** | Custom NestJS seed script + Faker.js | 10,000 Indian employees |
| **Testing** | Jest + Supertest | NestJS default, unit + e2e |
| **Containerization** | Docker + docker-compose | Local dev: Postgres + Redis in containers |

---

## 3. UI Pages & Use Cases

### 3.1 Layout & Navigation

```
┌─────────────────────────────────────────────────────────────┐
│  🏢 ACME Payroll   [Dashboard] [Employees] [Payroll]        │
│                    [Reports]   [Departments] [Audit Logs]   │
│                                              [HR: Priya ▾]  │
└─────────────────────────────────────────────────────────────┘
```

Sidebar navigation (collapsible). Top bar shows logged-in HR user + quick-action button.

---

### 3.2 Page: `/login`

**Use Case:** HR Manager authenticates to access the system.

```
┌──────────────────────────────────────┐
│         ACME Payroll System          │
│  ┌────────────────────────────────┐  │
│  │  Email:  [________________]   │  │
│  │  Password: [______________]   │  │
│  │           [  Sign In  ]       │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

**Data stored:** JWT token in httpOnly cookie or memory.

---

### 3.3 Page: `/dashboard`

**Use Case:** HR Manager's first view after login. Answers "What's the state of our payroll right now?"

```
┌─────────────────────────────────────────────────────────────────────┐
│  SUMMARY STRIP                                                        │
│  [10,000 Active Employees] [₹8.4 Cr Total Monthly Payroll]          │
│  [3 Departments Pending Review] [Current Period: Nov 2026 - Open]    │
├──────────────────────┬──────────────────────────────────────────────┤
│  PAYROLL COST        │  HEADCOUNT BY DEPARTMENT                      │
│  by Department       │  (Horizontal Bar Chart)                       │
│  (Bar Chart, INR)    │                                               │
├──────────────────────┼──────────────────────────────────────────────┤
│  SALARY DISTRIBUTION │  RECENT ACTIVITY                              │
│  by CTC Band         │  - Ramesh Kumar salary revised ₹80k→₹90k     │
│  (Histogram)         │  - Nov 2026 payroll run completed             │
│                      │  - 5 new employees added this week            │
├──────────────────────┴──────────────────────────────────────────────┤
│  QUICK ACTIONS                                                        │
│  [+ Add Employee]  [Open New Payroll Period]  [View Nov Payslips]    │
└─────────────────────────────────────────────────────────────────────┘
```

**APIs used:**
- `GET /reports/dashboard` → Cached KPIs
- `GET /reports/department-summary` → Chart data
- `GET /reports/salary-distribution` → Histogram data
- `GET /audit-logs?limit=5` → Recent activity

**Cache:** Dashboard KPIs cached in Redis (TTL: 10 minutes). Invalidated on payroll run or salary change.

---

### 3.4 Page: `/employees`

**Use Case:** HR Manager browses, searches, and filters the full employee roster. This is the most-used page.

```
┌─────────────────────────────────────────────────────────────────────┐
│  EMPLOYEES (10,247 total)                        [+ Add Employee]    │
├─────────────────────────────────────────────────────────────────────┤
│  🔍 Search by name, Emp ID, email...                                 │
│  Filters: [Department ▾] [City ▾] [Grade ▾] [Status ▾] [CTC Range] │
│                                                      [Clear Filters] │
├──────┬─────────────────┬────────────┬──────────┬────────┬───────────┤
│  ID  │  Name           │  Dept      │  Grade   │ City   │ Monthly   │
│      │                 │            │          │        │ CTC       │
├──────┼─────────────────┼────────────┼──────────┼────────┼───────────┤
│ E001 │ Ramesh Kumar    │ Engineering│ L3       │ Blr    │ ₹1,20,000 │
│ E002 │ Priya Sharma    │ Product    │ L4       │ Mumbai │ ₹2,10,000 │
│ E003 │ Amit Singh      │ Finance    │ L2       │ Delhi  │ ₹60,000   │
│  ... │  ...            │  ...       │  ...     │  ...   │  ...      │
├─────────────────────────────────────────────────────────────────────┤
│  Showing 1–20 of 10,247  [< Prev] [1] [2] ... [512] [Next >]       │
└─────────────────────────────────────────────────────────────────────┘
```

**APIs used:**
- `GET /employees?page=1&limit=20&search=&departmentId=&city=&grade=&status=&ctcMin=&ctcMax=&sortBy=name&order=ASC`

**Pagination:** Cursor-based for deep pages, offset for display. Default: 20 per page, max 100.

**UX notes:**
- Server-side search with 300ms debounce
- Column headers sortable (name, CTC, grade)
- Click row → navigate to employee detail
- Status badge: `Active` (green), `On Leave` (yellow), `Terminated` (red)

---

### 3.5 Page: `/employees/:id`

**Use Case:** HR views complete employee profile, salary history, and payslips.

```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Back to Employees                                 [Edit] [⋮]      │
│  EMPLOYEE PROFILE                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  👤 Ramesh Kumar          Status: ● Active                   │   │
│  │  Emp ID: EMP00123         DOJ: 01 Apr 2021 (3 yrs 7 mos)    │   │
│  │  Dept: Engineering        Grade: L3                           │   │
│  │  Designation: Senior Eng  City: Bangalore (Karnataka)         │   │
│  │  PAN: ABCDE1234F          UAN: 100234567890                  │   │
│  │  Tax Regime: New Regime   Email: ramesh.k@acme.com           │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  CURRENT SALARY                           CURRENT MONTH ESTIMATE     │
│  ┌─────────────────────────┐  ┌──────────────────────────────────┐  │
│  │ Monthly CTC: ₹1,20,000  │  │ Gross:        ₹1,07,000          │  │
│  │ Annual CTC: ₹14,40,000  │  │ (-) Emp PF:     ₹4,800          │  │
│  │ Basic: ₹48,000          │  │ (-) PT:           ₹200          │  │
│  │ HRA: ₹24,000            │  │ (-) TDS:        ₹8,250          │  │
│  │ Special Allow: ₹35,000  │  │ Net Take-Home: ₹93,750          │  │
│  │ Employer PF: ₹5,760     │  └──────────────────────────────────┘  │
│  └─────────────────────────┘                                         │
│                                                                       │
│  SALARY HISTORY                           [+ Revise Salary]          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Apr 2024: ₹1,20,000 CTC  (increment from ₹1,00,000, +20%)  │   │
│  │  Apr 2023: ₹1,00,000 CTC  (increment from ₹85,000, +17.6%)  │   │
│  │  Apr 2021: ₹85,000 CTC    (joining salary)                   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  PAYSLIP HISTORY (last 6 months)                                     │
│  [Nov 2026: ₹93,750 ↓PDF] [Oct 2026: ₹93,750 ↓PDF] ...            │
└─────────────────────────────────────────────────────────────────────┘
```

**APIs used:**
- `GET /employees/:id` → Profile + current salary
- `GET /employees/:id/salary-history` → List of revisions
- `GET /employees/:id/payslips?page=1&limit=6` → Paginated payslips

---

### 3.6 Page: `/employees/new` and `/employees/:id/edit`

**Use Case:** Add new employee or update existing. Single-page form with sections.

```
┌─────────────────────────────────────────────────────────────────────┐
│  ADD NEW EMPLOYEE                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│  PERSONAL INFO                                                        │
│  First Name* [__________]  Last Name* [__________]                   │
│  Email* [__________________]  Date of Birth [__/__/____]             │
│  Gender [Male ▾]  PAN [__________]                                   │
│                                                                       │
│  EMPLOYMENT INFO                                                      │
│  Employee ID [Auto-generated]  Date of Joining* [__/__/____]         │
│  Department* [__________▾]  Designation* [__________]                │
│  Grade* [L1 ▾]  Employment Type [Full-time ▾]                       │
│  Work City* [Bangalore ▾]  Work State* [Karnataka - auto]            │
│                                                                       │
│  SALARY INFO (CTC-based)                                              │
│  Annual CTC* [₹ ____________]                                        │
│  Auto-computed:                                                       │
│  Basic (40%): ₹—   HRA (50% of Basic): ₹—   Special Allow: ₹—      │
│  Employer PF: ₹—   Gratuity Provision: ₹—                            │
│  Effective From* [__/__/____]                                         │
│                                                                       │
│  TAX INFO                                                             │
│  Tax Regime [New Regime ▾]  UAN [__________________]                 │
│                                                                       │
│            [Cancel]  [Save Employee]                                  │
└─────────────────────────────────────────────────────────────────────┘
```

**APIs used:**
- `POST /employees` → Create
- `PATCH /employees/:id` → Update
- `GET /departments` → Populate dropdown (cached)

**UX:** CTC breakdown auto-computes live as user types the annual CTC.

---

### 3.7 Page: `/salary-revision/:employeeId`

**Use Case:** HR initiates a salary revision with effective date.

```
┌─────────────────────────────────────────────────────────────────────┐
│  SALARY REVISION — Ramesh Kumar (EMP00123)                           │
│                                                                       │
│  Current CTC: ₹14,40,000/yr (₹1,20,000/mo)                         │
│  Current Basic: ₹48,000/mo                                           │
│                                                                       │
│  New Annual CTC* [₹ ________________]                                │
│  Effective From* [__/__/____]  (can be retroactive for arrears)      │
│  Revision Reason* [Promotion ▾]                                       │
│  Remarks [_________________________________]                          │
│                                                                       │
│  NEW BREAKDOWN (auto-computed):                                       │
│  Basic: ₹—   HRA: ₹—   Special Allow: ₹—                            │
│  Employer PF: ₹—   Gratuity: ₹—                                      │
│                                                                       │
│  ⚠️  Arrears: Effective from 01-Oct-2026, 1 month arrear = ₹X,XXX   │
│                                                                       │
│            [Cancel]  [Save Revision]                                  │
└─────────────────────────────────────────────────────────────────────┘
```

**APIs used:**
- `POST /salary-structures` → Create new SCD2 record with effective date

---

### 3.8 Page: `/payroll`

**Use Case:** HR views all payroll periods — history and current.

```
┌─────────────────────────────────────────────────────────────────────┐
│  PAYROLL PERIODS                          [+ Open New Period]        │
├─────────────┬────────────┬────────────┬──────────────┬──────────────┤
│  Period      │  Employees │  Total Net │  Status      │  Actions     │
├─────────────┼────────────┼────────────┼──────────────┼──────────────┤
│  Nov 2026   │  10,247    │  —         │  🟡 Open     │  [Run] [View]│
│  Oct 2026   │  10,189    │  ₹8.4 Cr  │  🔴 Locked   │  [View]      │
│  Sep 2026   │  10,152    │  ₹8.2 Cr  │  🔴 Locked   │  [View]      │
│  Aug 2026   │  10,101    │  ₹8.1 Cr  │  🔴 Locked   │  [View]      │
│  ...        │  ...       │  ...       │  ...         │  ...         │
├─────────────────────────────────────────────────────────────────────┤
│  Showing 1–10 of 32  [< Prev] [1] [2] [3] [Next >]                 │
└─────────────────────────────────────────────────────────────────────┘
```

**APIs used:**
- `GET /payroll-periods?page=1&limit=10`
- `POST /payroll-periods` → Open new period

---

### 3.9 Page: `/payroll/:periodId`

**Use Case:** HR runs payroll for a period, reviews exceptions, views all payslips, and locks the period.

```
┌─────────────────────────────────────────────────────────────────────┐
│  PAYROLL — NOVEMBER 2026               Status: 🟡 Open              │
│  Period: 01 Nov – 30 Nov 2026   Pay Date: 30 Nov 2026               │
│                                                                       │
│  SUMMARY (after run)                                                  │
│  Employees Processed: 10,247   Total Gross: ₹10.2 Cr               │
│  Total Net Pay: ₹8.4 Cr         Total PF (Employer): ₹89L          │
│  Total TDS: ₹1.1 Cr             Total PT: ₹8.7L                    │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  [▶ Run Payroll]  Running payroll calculates all 10,247 payslips│  │
│  │  [🔒 Lock Period] Once locked, payslips become immutable        │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  PAYSLIPS                                                             │
│  🔍 Search employee...  [Dept ▾]  [Grade ▾]                          │
│  ┌──────────┬──────────────────┬──────────┬──────────┬────────────┐  │
│  │ Emp ID   │ Name             │ Gross    │ Net Pay  │ Actions    │  │
│  ├──────────┼──────────────────┼──────────┼──────────┼────────────┤  │
│  │ EMP00123 │ Ramesh Kumar     │₹1,07,000 │ ₹93,750  │[View PDF]  │  │
│  │ EMP00124 │ Priya Sharma     │₹1,89,000 │₹1,67,350 │[View PDF]  │  │
│  │ ...      │ ...              │ ...      │ ...      │ ...        │  │
│  └──────────┴──────────────────┴──────────┴──────────┴────────────┘  │
│  Showing 1–20 of 10,247  [< Prev]  [1] [2] ... [512]  [Next >]      │
└─────────────────────────────────────────────────────────────────────┘
```

**APIs used:**
- `GET /payroll-periods/:id` → Period detail + summary
- `POST /payroll-periods/:id/run` → Trigger payroll calculation
- `POST /payroll-periods/:id/lock` → Lock period
- `GET /payroll-periods/:id/payslips?page=1&limit=20&search=&departmentId=`

---

### 3.10 Page: `/payslip/:payslipId`

**Use Case:** View or print a single employee's payslip for a period.

```
┌─────────────────────────────────────────────────────────────────────┐
│  PAYSLIP                             [🖨 Print] [⬇ Download PDF]   │
│  ─────────────────────────────────────────────────────────────────  │
│  ACME Pvt Ltd                        PAYSLIP FOR NOVEMBER 2026       │
│  Employee: Ramesh Kumar              Emp ID: EMP00123                │
│  Designation: Senior Engineer        Dept: Engineering                │
│  Location: Bangalore (Karnataka)     PAN: ABCDE1234F                │
│  UAN: 100234567890                   Tax Regime: New Regime          │
│  ─────────────────────────────────────────────────────────────────  │
│  EARNINGS                            DEDUCTIONS                      │
│  Basic Salary:        ₹48,000        Employee PF:          ₹5,760   │
│  House Rent Allow:    ₹24,000        Professional Tax:       ₹200   │
│  Leave Travel Allow:   ₹1,667        TDS (Income Tax):    ₹8,250   │
│  Special Allowance:   ₹33,333                                        │
│  ─────────────────────────────────────────────────────────────────  │
│  GROSS SALARY:       ₹1,07,000       TOTAL DEDUCTIONS:    ₹14,210  │
│  ─────────────────────────────────────────────────────────────────  │
│                   NET PAY (TAKE-HOME): ₹92,790                      │
│  ─────────────────────────────────────────────────────────────────  │
│  EMPLOYER CONTRIBUTIONS (not in hand)                                │
│  Employer PF: ₹5,760    Gratuity Provision: ₹1,923                  │
│  Monthly CTC: ₹1,14,683                                              │
└─────────────────────────────────────────────────────────────────────┘
```

**APIs used:** `GET /payslips/:id`

---

### 3.11 Page: `/reports`

**Use Case:** HR answers organizational salary questions — the analytical layer.

```
┌─────────────────────────────────────────────────────────────────────┐
│  REPORTS & ANALYTICS                                                  │
│  ─────────────────────────────────────────────────────────────────  │
│  SALARY BY DEPARTMENT          SALARY DISTRIBUTION (CTC Bands)       │
│  [Bar Chart: Dept vs Avg CTC]  [Histogram: ₹2L-4L, 4L-6L, etc.]    │
│                                                                       │
│  PAYROLL TREND (last 6 months)      HEADCOUNT BY CITY                │
│  [Line chart: monthly total cost]   [Treemap / Bar: city-wise count] │
│                                                                       │
│  GRADE-WISE SALARY SUMMARY                                           │
│  ┌────────┬──────────┬──────────┬──────────┬──────────┐             │
│  │ Grade  │ Count    │ Min CTC  │ Avg CTC  │ Max CTC  │             │
│  ├────────┼──────────┼──────────┼──────────┼──────────┤             │
│  │ L1     │ 1,842    │ ₹2.4L   │ ₹3.2L   │ ₹4.8L   │             │
│  │ L2     │ 2,951    │ ₹4.8L   │ ₹6.5L   │ ₹9.6L   │             │
│  │ ...    │ ...      │ ...      │ ...      │ ...      │             │
│  └────────┴──────────┴──────────┴──────────┴──────────┘             │
│                                                                       │
│  Filters: [Period ▾] [Department ▾] [City ▾]  [⬇ Export CSV]       │
└─────────────────────────────────────────────────────────────────────┘
```

**APIs used:**
- `GET /reports/salary-by-department`
- `GET /reports/salary-distribution`
- `GET /reports/payroll-trend?months=6`
- `GET /reports/headcount-by-city`
- `GET /reports/grade-summary`
- `GET /reports/export?format=csv&...` → Streamed CSV

---

### 3.12 Page: `/departments`

**Use Case:** HR manages the org structure (departments, designations).

```
┌─────────────────────────────────────────────────────────────────────┐
│  DEPARTMENTS                               [+ Add Department]        │
├──────────────────┬──────────────┬──────────────────────────────────┤
│  Department       │  Headcount   │  Avg Monthly CTC   │  Actions   │
├──────────────────┼──────────────┼──────────────────────────────────┤
│  Engineering      │  3,201       │  ₹1,05,000         │ [Edit]     │
│  Product          │  812         │  ₹1,38,000         │ [Edit]     │
│  Finance          │  541         │  ₹82,000           │ [Edit]     │
│  ...              │  ...         │  ...               │ ...        │
└─────────────────────────────────────────────────────────────────────┘
```

**APIs used:** `GET /departments`, `POST /departments`, `PATCH /departments/:id`

---

### 3.13 Page: `/audit-logs`

**Use Case:** HR can see every salary change, who made it, and when — for compliance.

```
┌─────────────────────────────────────────────────────────────────────┐
│  AUDIT LOGS                                                           │
│  Filters: [Entity Type ▾] [From Date] [To Date] [Changed By ▾]      │
├────────────┬──────────────────────────────────┬────────────┬────────┤
│  Timestamp  │  Action                           │ Changed By │ Entity │
├────────────┼──────────────────────────────────┼────────────┼────────┤
│ 19 Nov '26 │ Salary revised: ₹1.2L→₹1.44L    │ Priya HR   │ EMP123 │
│ 18 Nov '26 │ Payroll locked: Nov 2026          │ System     │ P-NOV  │
│ 17 Nov '26 │ Employee added: Amit Singh        │ Priya HR   │ EMP892 │
│ ...        │ ...                               │ ...        │ ...    │
├─────────────────────────────────────────────────────────────────────┤
│  Showing 1–20 of 4,821  [< Prev]  [1] [2] ... [241]  [Next >]      │
└─────────────────────────────────────────────────────────────────────┘
```

**APIs used:** `GET /audit-logs?page=1&limit=20&entityType=&from=&to=&changedBy=`

---

## 4. Database Schema

### Schema Overview

```
users ─────────────────────────────────── HR admins who log in
departments ───────────────────────────── Org structure
employees ─────┬──── departments (FK) ─── 10,000 employees
               └──── salary_structures ── SCD Type 2 salary records
payroll_periods ──── payslips ──────────── Monthly payroll run
                         └── payslip_items ─ Line items (earnings/deductions)
audit_logs ───────────────────────────────── Immutable change log
```

---

### Table: `users`
```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name   VARCHAR(255) NOT NULL,
  role        VARCHAR(50) DEFAULT 'HR_ADMIN',  -- HR_ADMIN | VIEWER
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Table: `departments`
```sql
CREATE TABLE departments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) UNIQUE NOT NULL,     -- 'Engineering', 'Product'
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Table: `employees`
```sql
CREATE TABLE employees (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code      VARCHAR(20) UNIQUE NOT NULL,  -- EMP00123
  first_name         VARCHAR(100) NOT NULL,
  last_name          VARCHAR(100) NOT NULL,
  email              VARCHAR(255) UNIQUE NOT NULL,
  date_of_birth      DATE,
  gender             VARCHAR(10),                   -- M | F | Other
  pan_number         VARCHAR(10),                   -- Stored hashed/masked
  uan_number         VARCHAR(20),                   -- EPFO UAN
  date_of_joining    DATE NOT NULL,
  date_of_leaving    DATE,                          -- NULL = active
  employment_status  VARCHAR(20) DEFAULT 'ACTIVE',  -- ACTIVE | ON_LEAVE | TERMINATED
  employment_type    VARCHAR(20) DEFAULT 'FULL_TIME',
  designation        VARCHAR(150),
  grade              VARCHAR(10),                   -- L1, L2, L3, L4, L5, L6
  department_id      UUID REFERENCES departments(id),
  work_city          VARCHAR(100),                  -- Bangalore, Mumbai, etc.
  work_state         VARCHAR(100),                  -- Karnataka, Maharashtra
  tax_regime         VARCHAR(20) DEFAULT 'NEW',     -- OLD | NEW
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
```

**Why these fields?**
- `work_state` is critical: Professional Tax slab depends on state
- `tax_regime` per employee: TDS calculation path differs (Old vs New)
- `pan_number` stored masked for display; full value encrypted at rest
- `employment_status` enables soft-delete pattern (no hard deletes on financial data)

---

### Table: `salary_structures` ← SCD Type 2
```sql
CREATE TABLE salary_structures (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id          UUID NOT NULL REFERENCES employees(id),
  annual_ctc           NUMERIC(14, 2) NOT NULL,     -- Total CTC per year
  monthly_ctc          NUMERIC(12, 2) NOT NULL,     -- annual_ctc / 12

  -- Earnings (monthly)
  basic_monthly        NUMERIC(10, 2) NOT NULL,     -- 40-50% of monthly CTC
  hra_monthly          NUMERIC(10, 2) NOT NULL,     -- 50% of Basic (metro) / 40%
  lta_monthly          NUMERIC(10, 2) DEFAULT 0,
  special_allowance    NUMERIC(10, 2),              -- Balancing figure
  other_allowances     NUMERIC(10, 2) DEFAULT 0,

  -- Employer contributions (part of CTC, NOT in hand)
  employer_pf_monthly  NUMERIC(10, 2),              -- 12% of Basic
  gratuity_monthly     NUMERIC(10, 2),              -- ~4.81% of Basic

  -- Metadata
  effective_from       DATE NOT NULL,
  effective_to         DATE,                        -- NULL = current active
  revision_reason      VARCHAR(100),               -- JOINING | PROMOTION | APPRAISAL | CORRECTION
  remarks              TEXT,
  created_by           UUID REFERENCES users(id),
  created_at           TIMESTAMPTZ DEFAULT NOW()
);
```

**Why SCD Type 2?**
When a salary is revised, we do NOT update the existing row. Instead:
1. Set `effective_to = revision_date - 1 day` on old record
2. Insert new record with `effective_from = revision_date`, `effective_to = NULL`

This ensures historical payroll periods always recalculate using the salary that was **active at that time**, not today's salary. Critical for auditability.

---

### Table: `payroll_periods`
```sql
CREATE TABLE payroll_periods (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_name    VARCHAR(50) NOT NULL,     -- 'November 2026'
  fiscal_year    VARCHAR(10) NOT NULL,     -- '2026-27' (Indian FY)
  month          SMALLINT NOT NULL,        -- 1-12
  year           SMALLINT NOT NULL,
  start_date     DATE NOT NULL,
  end_date       DATE NOT NULL,
  pay_date       DATE,
  status         VARCHAR(20) DEFAULT 'OPEN',  -- OPEN | PROCESSING | LOCKED
  total_employees INT,
  total_gross    NUMERIC(16, 2),
  total_net      NUMERIC(16, 2),
  total_pf       NUMERIC(14, 2),
  total_tds      NUMERIC(14, 2),
  run_at         TIMESTAMPTZ,
  locked_at      TIMESTAMPTZ,
  created_by     UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
```

**Status lifecycle:** `OPEN → PROCESSING → LOCKED`
- `OPEN`: Edits allowed, payroll not yet run
- `PROCESSING`: Payroll run triggered (temporary state)
- `LOCKED`: Immutable. No edits to payslips permitted.

---

### Table: `payslips`
```sql
CREATE TABLE payslips (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID NOT NULL REFERENCES employees(id),
  period_id       UUID NOT NULL REFERENCES payroll_periods(id),
  
  -- Snapshotted at run time (do NOT recalculate from live data)
  gross_earnings  NUMERIC(12, 2) NOT NULL,
  total_deductions NUMERIC(12, 2) NOT NULL,
  net_pay         NUMERIC(12, 2) NOT NULL,
  
  -- Deduction breakdown (snapshotted)
  employee_pf     NUMERIC(10, 2) DEFAULT 0,
  employee_esi    NUMERIC(10, 2) DEFAULT 0,
  professional_tax NUMERIC(8, 2) DEFAULT 0,
  tds             NUMERIC(10, 2) DEFAULT 0,
  
  -- Employer side (for CTC view)
  employer_pf     NUMERIC(10, 2) DEFAULT 0,
  gratuity_prov   NUMERIC(10, 2) DEFAULT 0,
  monthly_ctc     NUMERIC(12, 2),
  
  -- Snapshot of salary structure used
  salary_structure_id UUID REFERENCES salary_structures(id),
  
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(employee_id, period_id)  -- One payslip per employee per period
);
```

**Why snapshot?** Even if the employee's salary is revised tomorrow, the October payslip must forever show October's values. The `salary_structure_id` FK helps trace back but values are stored directly.

---

### Table: `payslip_items`
```sql
CREATE TABLE payslip_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payslip_id  UUID NOT NULL REFERENCES payslips(id) ON DELETE CASCADE,
  item_type   VARCHAR(20) NOT NULL,   -- EARNING | DEDUCTION | EMPLOYER_CONTRIB
  item_name   VARCHAR(100) NOT NULL,  -- 'Basic Salary', 'HRA', 'Employee PF', 'TDS'
  amount      NUMERIC(12, 2) NOT NULL,
  sort_order  SMALLINT DEFAULT 0,     -- Controls display order in payslip
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

**Why separate line items?**
Payslips need to display itemized breakdowns. Storing them as separate rows allows flexible addition of ad-hoc components (bonus, arrears, LOP deduction) without schema changes.

---

### Table: `audit_logs`
```sql
CREATE TABLE audit_logs (
  id          BIGSERIAL PRIMARY KEY,          -- BIGINT for high volume
  entity_type VARCHAR(50) NOT NULL,           -- 'EMPLOYEE' | 'SALARY_STRUCTURE' | 'PAYROLL_PERIOD'
  entity_id   UUID NOT NULL,
  action      VARCHAR(50) NOT NULL,           -- 'CREATE' | 'UPDATE' | 'DELETE' | 'PAYROLL_RUN' | 'PERIOD_LOCK'
  old_values  JSONB,                          -- State before change
  new_values  JSONB,                          -- State after change
  changed_by  UUID REFERENCES users(id),
  changed_by_name VARCHAR(255),              -- Denormalized for display (user may be deleted later)
  ip_address  VARCHAR(45),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

**Why BIGSERIAL?** Audit logs grow fast (every change = 1 row). UUID as PK would cause index fragmentation at this insert rate. Sequential BIGINT is optimal. **Append-only** — no UPDATEs or DELETEs ever.

---

## 5. TypeORM Entity Definitions

### Employee Entity
```typescript
@Entity('employees')
@Index(['departmentId', 'employmentStatus', 'grade'])  // Composite - most common filter
@Index(['workState'])                                   // For PT calculation queries
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'employee_code', unique: true })
  employeeCode: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'work_state', nullable: true })
  workState: string;

  @Column({ name: 'work_city', nullable: true })
  workCity: string;

  @Column({ name: 'tax_regime', default: 'NEW' })
  taxRegime: 'OLD' | 'NEW';

  @Column({ name: 'employment_status', default: 'ACTIVE' })
  employmentStatus: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';

  @Column({ nullable: true })
  grade: string;

  @Column({ name: 'department_id', nullable: true })
  departmentId: string;

  @ManyToOne(() => Department)
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @OneToMany(() => SalaryStructure, (s) => s.employee)
  salaryStructures: SalaryStructure[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

### SalaryStructure Entity
```typescript
@Entity('salary_structures')
@Index(['employeeId', 'effectiveFrom'])    // Fetch current salary for employee
@Index(['effectiveTo'])                    // Find currently active structures
export class SalaryStructure {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'employee_id' })
  employeeId: string;

  @ManyToOne(() => Employee, (e) => e.salaryStructures)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ name: 'annual_ctc', type: 'numeric', precision: 14, scale: 2 })
  annualCtc: number;

  @Column({ name: 'basic_monthly', type: 'numeric', precision: 10, scale: 2 })
  basicMonthly: number;

  @Column({ name: 'hra_monthly', type: 'numeric', precision: 10, scale: 2 })
  hraMonthly: number;

  @Column({ name: 'effective_from', type: 'date' })
  effectiveFrom: Date;

  @Column({ name: 'effective_to', type: 'date', nullable: true })
  effectiveTo: Date | null;    // NULL = currently active
}
```

---

## 6. Indexing Strategy

### Why Indexing Matters Here
With 10,000 employees × 12 payroll periods × avg 10 payslip items = **1.2M payslip_items rows in year 1**, growing each year. Without proper indexes, queries slow to seconds.

### Complete Index Plan

```sql
-- ─── EMPLOYEES TABLE ───────────────────────────────────────────────
-- Composite: covers most common list-page filter combinations
CREATE INDEX idx_emp_dept_status_grade
  ON employees (department_id, employment_status, grade);

-- Full-text search on name + email (for /employees?search=)
CREATE INDEX idx_emp_fulltext
  ON employees USING GIN (
    to_tsvector('english', first_name || ' ' || last_name || ' ' || email)
  );

-- Employee code lookup (direct navigation)
CREATE UNIQUE INDEX idx_emp_code ON employees (employee_code);

-- State-based queries (for PT reports, state-wise analytics)
CREATE INDEX idx_emp_state ON employees (work_state);

-- City-based analytics
CREATE INDEX idx_emp_city ON employees (work_city);

-- ─── SALARY_STRUCTURES TABLE ───────────────────────────────────────
-- Get current salary for a specific employee
CREATE INDEX idx_sal_emp_effective
  ON salary_structures (employee_id, effective_from DESC);

-- Find all currently active salary records (effective_to IS NULL)
CREATE INDEX idx_sal_active
  ON salary_structures (effective_to)
  WHERE effective_to IS NULL;         -- Partial index! Only indexes NULLs

-- ─── PAYSLIPS TABLE ────────────────────────────────────────────────
-- Payslips for a specific period (payroll period page - 10,247 rows at once)
CREATE INDEX idx_payslip_period ON payslips (period_id);

-- Employee's payslip history
CREATE INDEX idx_payslip_employee ON payslips (employee_id);

-- Composite: filtered payslip list within a period
CREATE INDEX idx_payslip_period_emp ON payslips (period_id, employee_id);

-- ─── PAYSLIP_ITEMS TABLE ───────────────────────────────────────────
-- Fetch all line items for a payslip
CREATE INDEX idx_items_payslip ON payslip_items (payslip_id);

-- ─── PAYROLL_PERIODS TABLE ─────────────────────────────────────────
-- Status filter (find open periods)
CREATE INDEX idx_period_status ON payroll_periods (status);

-- Sort by year/month (listing page)
CREATE INDEX idx_period_date ON payroll_periods (year DESC, month DESC);

-- ─── AUDIT_LOGS TABLE ──────────────────────────────────────────────
-- Audit trail for a specific entity
CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id);

-- Time-range filtering
CREATE INDEX idx_audit_created ON audit_logs (created_at DESC);

-- Who made what changes
CREATE INDEX idx_audit_user ON audit_logs (changed_by, created_at DESC);
```

### Index Design Decisions

| Decision | Reason |
|---|---|
| **Partial index** on `salary_structures(effective_to) WHERE NULL` | Only current records queried at payroll run time. Partial index is 10x smaller |
| **GIN index** for employee search | Full-text search on name+email is far more flexible than `LIKE '%term%'` (which can't use B-Tree) |
| **Composite before single-column** on employees | HR always filters by dept + status together; composite covers both |
| **No index on `payslip_items.item_type`** | Low cardinality (3 values) — full table scan per payslip is fine; payslip_id FK index is enough |
| **BIGSERIAL PK** on audit_logs | Sequential inserts avoid B-Tree rebalancing. UUID PKs fragment heavily on append-heavy tables |

---

## 7. Caching Strategy

### What We Cache and Why

```
┌─────────────────────────────────────────────────────────┐
│                   REDIS CACHE DESIGN                     │
├────────────────────────┬────────────────────────────────┤
│  Key Pattern           │  TTL    │  When Invalidated     │
├────────────────────────┼─────────┼───────────────────────┤
│ dashboard:kpis         │ 10 min  │ Payroll run, new emp  │
│ departments:all        │ 30 min  │ Dept add/edit         │
│ reports:dept-summary   │ 15 min  │ Payroll run           │
│ reports:salary-dist    │ 15 min  │ Salary revision       │
│ reports:grade-summary  │ 15 min  │ Salary revision       │
│ emp-list:{hash}        │ 2 min   │ Filtered list pages   │
│ user:session:{userId}  │ 24 hr   │ Logout / expiry       │
└────────────────────────┴─────────┴───────────────────────┘
```

### Cache Key Strategy: Hash-based for List Pages

```typescript
// For GET /employees?page=2&departmentId=abc&grade=L3&status=ACTIVE
// Cache key = MD5 hash of sorted query params
const cacheKey = `emp-list:${createHash('md5')
  .update(JSON.stringify(sortedParams))
  .digest('hex')}`;
```

### What We Do NOT Cache

| Data | Reason |
|---|---|
| Individual employee profiles | Stale salary data would be misleading |
| Payslip detail | Must always be live; payroll is financial |
| Audit logs | Real-time compliance requirement |
| Active payroll period summary | HR needs live status during run |

### Cache Invalidation Pattern
```typescript
// On salary revision:
await redis.del('dashboard:kpis');
await redis.del('reports:dept-summary');
await redis.del('reports:salary-dist');
await redis.del('reports:grade-summary');
// Don't need to invalidate emp-list (it has 2min TTL anyway)
```

---

## 8. API Design

### Common API Conventions

- Base URL: `/api/v1`
- Auth: `Authorization: Bearer <JWT>` header on all protected routes
- Pagination response shape:
  ```json
  {
    "data": [...],
    "meta": {
      "total": 10247,
      "page": 1,
      "limit": 20,
      "totalPages": 513
    }
  }
  ```
- Error shape:
  ```json
  { "statusCode": 400, "message": "Validation failed", "errors": [...] }
  ```

---

### Auth APIs

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/login` | Login with email + password → JWT |
| `POST` | `/auth/logout` | Invalidate session |
| `GET` | `/auth/me` | Get logged-in user profile |

---

### Employee APIs

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/employees` | Paginated + filtered employee list |
| `POST` | `/employees` | Create new employee |
| `GET` | `/employees/:id` | Single employee with current salary |
| `PATCH` | `/employees/:id` | Update employee details |
| `DELETE` | `/employees/:id` | Soft-delete (set status=TERMINATED) |
| `GET` | `/employees/:id/salary-history` | All salary revisions (paginated) |
| `GET` | `/employees/:id/payslips` | Employee's payslip list (paginated) |

#### `GET /employees` — Query Params

```
?page=1
&limit=20                   (max 100)
&search=ramesh              (name / empCode / email — full text)
&departmentId=uuid
&grade=L3
&status=ACTIVE              (ACTIVE | ON_LEAVE | TERMINATED)
&workCity=Bangalore
&workState=Karnataka
&ctcMin=1000000             (annual CTC, in paise or rupees)
&ctcMax=5000000
&sortBy=firstName           (firstName | grade | monthlyCTC | createdAt)
&order=ASC
```

#### Response: `GET /employees/:id`
```json
{
  "id": "uuid",
  "employeeCode": "EMP00123",
  "firstName": "Ramesh",
  "lastName": "Kumar",
  "email": "ramesh@acme.com",
  "designation": "Senior Engineer",
  "grade": "L3",
  "workCity": "Bangalore",
  "workState": "Karnataka",
  "taxRegime": "NEW",
  "employmentStatus": "ACTIVE",
  "dateOfJoining": "2021-04-01",
  "department": { "id": "uuid", "name": "Engineering" },
  "currentSalary": {
    "annualCtc": 1440000,
    "monthlyCtc": 120000,
    "basicMonthly": 48000,
    "hraMonthly": 24000,
    "specialAllowance": 35000,
    "employerPfMonthly": 5760,
    "gratuityMonthly": 1923,
    "effectiveFrom": "2024-04-01"
  }
}
```

---

### Salary Structure APIs

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/salary-structures` | Create revision (closes old record, opens new) |
| `GET` | `/salary-structures/:id` | Single salary structure detail |

#### `POST /salary-structures` — Body
```json
{
  "employeeId": "uuid",
  "annualCtc": 1680000,
  "effectiveFrom": "2024-10-01",
  "revisionReason": "PROMOTION",
  "remarks": "Promoted to L4"
}
```

**Service layer auto-computes:** basicMonthly (40% of monthly CTC), hraMonthly (50% of Basic if metro city, 40% if non-metro), specialAllowance (balancing figure), employerPfMonthly, gratuityMonthly.

---

### Department APIs

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/departments` | All departments (cached, no pagination needed — <100 items) |
| `POST` | `/departments` | Create department |
| `PATCH` | `/departments/:id` | Update |

---

### Payroll Period APIs

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/payroll-periods` | Paginated list of periods |
| `POST` | `/payroll-periods` | Open a new period |
| `GET` | `/payroll-periods/:id` | Period detail + summary stats |
| `POST` | `/payroll-periods/:id/run` | Trigger payroll calculation |
| `POST` | `/payroll-periods/:id/lock` | Lock the period |
| `GET` | `/payroll-periods/:id/payslips` | Paginated payslips for period |

#### `GET /payroll-periods?page=1&limit=10`
```json
{
  "data": [
    {
      "id": "uuid",
      "periodName": "November 2026",
      "fiscalYear": "2026-27",
      "startDate": "2026-11-01",
      "endDate": "2026-11-30",
      "status": "OPEN",
      "totalEmployees": null,
      "totalNet": null,
      "runAt": null
    },
    {
      "id": "uuid",
      "periodName": "October 2026",
      "status": "LOCKED",
      "totalEmployees": 10189,
      "totalNet": 84200000.00,
      "runAt": "2026-10-28T10:30:00Z"
    }
  ],
  "meta": { "total": 32, "page": 1, "limit": 10, "totalPages": 4 }
}
```

#### `POST /payroll-periods/:id/run`
Triggers synchronous batch calculation (for MVP scope). For 10,000 employees:
- Fetches all active employees + their active salary structure
- Calculates PF, ESI, PT, TDS for each
- Inserts payslips + payslip_items in a **transaction**
- Updates period summary (total_gross, total_net, total_employees)
- Returns summary on completion

```json
// Response
{
  "periodId": "uuid",
  "status": "PROCESSING_COMPLETE",
  "totalEmployees": 10247,
  "totalGross": 102000000.00,
  "totalNet": 84200000.00,
  "durationMs": 4800
}
```

---

### Payslip APIs

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/payslips/:id` | Full payslip with line items |

#### `GET /payslips/:id`
```json
{
  "id": "uuid",
  "employee": { "code": "EMP00123", "name": "Ramesh Kumar", "pan": "ABCXX1234F" },
  "period": { "name": "November 2026", "startDate": "2026-11-01" },
  "grossEarnings": 107000,
  "totalDeductions": 14210,
  "netPay": 92790,
  "items": [
    { "type": "EARNING", "name": "Basic Salary", "amount": 48000, "sortOrder": 1 },
    { "type": "EARNING", "name": "House Rent Allowance", "amount": 24000, "sortOrder": 2 },
    { "type": "EARNING", "name": "Special Allowance", "amount": 33333, "sortOrder": 3 },
    { "type": "DEDUCTION", "name": "Employee PF", "amount": 5760, "sortOrder": 10 },
    { "type": "DEDUCTION", "name": "Professional Tax", "amount": 200, "sortOrder": 11 },
    { "type": "DEDUCTION", "name": "TDS (Income Tax)", "amount": 8250, "sortOrder": 12 },
    { "type": "EMPLOYER_CONTRIB", "name": "Employer PF", "amount": 5760, "sortOrder": 20 },
    { "type": "EMPLOYER_CONTRIB", "name": "Gratuity Provision", "amount": 1923, "sortOrder": 21 }
  ]
}
```

---

### Reports APIs

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/reports/dashboard` | KPIs (cached 10 min) |
| `GET` | `/reports/department-summary` | Dept-wise headcount + avg CTC |
| `GET` | `/reports/salary-distribution` | CTC band histogram |
| `GET` | `/reports/payroll-trend?months=6` | Monthly payroll totals |
| `GET` | `/reports/grade-summary` | Grade-wise min/avg/max CTC |
| `GET` | `/reports/headcount-by-city` | City-wise active headcount |
| `GET` | `/reports/export?type=employees&format=csv` | Streamed CSV export |

---

### Audit Log APIs

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/audit-logs` | Paginated audit trail |

```
?page=1&limit=20
&entityType=EMPLOYEE
&entityId=uuid
&changedBy=userId
&from=2026-01-01
&to=2026-11-30
```

---

## 9. Payroll Calculation Engine (LLD)

This is the core business logic. All calculations happen in a **single TypeScript service class** `PayrollCalculationService`.

### Calculation Flow (per employee)

```typescript
class PayrollCalculationService {

  async calculateForEmployee(
    employee: Employee,
    salaryStructure: SalaryStructure,
    payrollPeriod: PayrollPeriod
  ): Promise<PayslipCalculationResult> {

    const { basicMonthly, hraMonthly, ltaMonthly, specialAllowance } = salaryStructure;

    // 1. GROSS EARNINGS
    const grossSalary = basicMonthly + hraMonthly + ltaMonthly + specialAllowance;

    // 2. EMPLOYEE PF
    // PF is on Basic + DA. Statutory wage ceiling: ₹15,000
    const pfWage = Math.min(basicMonthly, 15000);
    const employeePF = round(pfWage * 0.12);
    const employerPF = round(pfWage * 0.12);

    // 3. ESI (only if gross ≤ ₹21,000)
    const employeeESI = grossSalary <= 21000 ? round(grossSalary * 0.0075) : 0;
    const employerESI = grossSalary <= 21000 ? round(grossSalary * 0.0325) : 0;

    // 4. PROFESSIONAL TAX (state-specific)
    const profTax = this.calculateProfessionalTax(
      employee.workState,
      employee.gender,
      grossSalary,
      payrollPeriod.month
    );

    // 5. TDS (income tax / 12, based on regime)
    const annualTax = employee.taxRegime === 'NEW'
      ? this.calculateTaxNewRegime(salaryStructure.annualCtc)
      : this.calculateTaxOldRegime(salaryStructure.annualCtc, basicMonthly, hraMonthly);

    const monthlyTDS = round(annualTax / 12);

    // 6. GRATUITY PROVISION
    const gratuityProvision = round(basicMonthly * 0.0481);

    // 7. NET PAY
    const totalDeductions = employeePF + employeeESI + profTax + monthlyTDS;
    const netPay = grossSalary - totalDeductions;

    return {
      grossEarnings: grossSalary,
      totalDeductions,
      netPay,
      employeePF, employeeESI,
      professionalTax: profTax,
      tds: monthlyTDS,
      employerPF, employerESI,
      gratuityProvision,
      items: this.buildLineItems(...)
    };
  }

  private calculateProfessionalTax(
    state: string, gender: string, grossMonthly: number, month: number
  ): number {
    const isFebruary = month === 2;
    switch (state?.toUpperCase()) {
      case 'MAHARASHTRA':
        if (gender === 'F' && grossMonthly <= 25000) return 0;
        if (grossMonthly <= 7500) return 0;
        if (grossMonthly <= 10000) return 175;
        return isFebruary ? 300 : 200;
      case 'KARNATAKA':
        return grossMonthly < 25000 ? 0 : (isFebruary ? 300 : 200);
      case 'TAMIL_NADU':
        return grossMonthly <= 21000 ? 0 : 208;
      case 'DELHI': case 'HARYANA': case 'UTTAR_PRADESH':
        return 0;
      default:
        return grossMonthly > 10000 ? (isFebruary ? 300 : 200) : 0;
    }
  }

  private calculateTaxNewRegime(annualCtc: number): number {
    const taxable = Math.max(0, annualCtc - 75000); // ₹75,000 standard deduction
    if (taxable <= 300000) return 0;
    if (taxable <= 700000) {
      const tax = (taxable - 300000) * 0.05;
      return taxable <= 700000 ? 0 : tax * 1.04; // 87A rebate
    }
    // ... slab calculation + 4% cess
  }
}
```

### Batch Payroll Run (10,000 employees)

```typescript
async runPayroll(periodId: string): Promise<void> {
  // 1. Set period to PROCESSING
  await this.periodsRepo.update(periodId, { status: 'PROCESSING' });

  // 2. Fetch all active employees + their active salary structure
  const employees = await this.employeesRepo
    .createQueryBuilder('e')
    .leftJoinAndSelect('e.department', 'dept')
    .leftJoinAndSelect(
      'e.salaryStructures', 'ss',
      'ss.effectiveTo IS NULL'  // Only active salary structure
    )
    .where('e.employmentStatus = :status', { status: 'ACTIVE' })
    .getMany();

  // 3. Calculate payslips in batches (avoid memory explosion)
  const BATCH_SIZE = 500;
  const payslips: Payslip[] = [];

  for (let i = 0; i < employees.length; i += BATCH_SIZE) {
    const batch = employees.slice(i, i + BATCH_SIZE);
    const batchPayslips = await Promise.all(
      batch.map(emp => this.calculateForEmployee(emp, emp.salaryStructures[0], period))
    );
    payslips.push(...batchPayslips);
  }

  // 4. Bulk insert in a single transaction
  await this.dataSource.transaction(async (manager) => {
    await manager.insert(Payslip, payslips);
    // Insert all payslip items
    const allItems = payslips.flatMap(p => p.items);
    await manager.insert(PayslipItem, allItems);
    // Update period summary
    await manager.update(PayrollPeriod, periodId, {
      status: 'OPEN',  // Back to OPEN after run, HR can review
      totalEmployees: payslips.length,
      totalGross: sum(payslips, 'grossEarnings'),
      totalNet: sum(payslips, 'netPay'),
      runAt: new Date()
    });
  });
}
```

---

## 10. System Design Concepts Applied

### A. Soft Deletes
Employees are never hard-deleted. `employment_status = TERMINATED` + `date_of_leaving` set. Historical payslips remain intact and linked.

### B. Immutability of Locked Periods
Once `payroll_periods.status = 'LOCKED'`, application-layer guard prevents any INSERT/UPDATE to `payslips` or `payslip_items` for that period. Financial data must never be mutated post-lock.

### C. SCD Type 2 (Slowly Changing Dimension)
Salary structures use effective dating. This is the most important design decision — it makes the system historically correct without any data loss.

### D. Snapshot Pattern
Payslip values are computed and stored at run time. Even if the salary structure changes next month, October's payslip values remain unchanged.

### E. Database-Level Financial Precision
All monetary columns use PostgreSQL `NUMERIC(precision, scale)` — never `FLOAT` or `DOUBLE`. This prevents rounding errors in currency calculations.

### F. Read-Through Cache
```
Request → Check Redis (cache hit?) → YES: return cached
                                  → NO: query DB → store in Redis → return
```
Implemented via a decorator pattern in NestJS service layer.

### G. Pagination — Offset for Display
Using standard `LIMIT/OFFSET` pagination. For the employee list at 10,000 rows:
- Offset pagination is acceptable (HR rarely goes past page 50)
- `COUNT(*)` query runs against the indexed table, response is fast
- For exports, we stream data in batches rather than loading all into memory

### H. Audit Logging as a Cross-Cutting Concern
Audit logs are written via a **NestJS Interceptor** so individual service methods don't need to manually log. Any route decorated with `@Audit('SALARY_STRUCTURE', 'UPDATE')` automatically captures before/after state.

### I. Connection Pooling
TypeORM's built-in connection pool configured for optimal performance:
```typescript
TypeOrmModule.forRoot({
  type: 'postgres',
  ...
  extra: {
    max: 20,          // Max 20 DB connections
    min: 5,           // Keep 5 warm
    idleTimeoutMillis: 30000
  }
})
```

### J. DTO Validation Layer
Every API input passes through `class-validator` DTOs before reaching the service layer. Invalid requests are rejected at the controller with structured error messages — the DB is never touched with bad data.

---

## 11. What We're Deliberately Leaving Out

| Feature | Reason for Exclusion |
|---|---|
| **Employee Self-Service Portal** | Requires separate auth flow for 10,000 users; HR-only tool per problem statement |
| **PF/ESI ECR file generation** | Government portal format; not core to the salary management ask |
| **Form 16 / Form 24Q TDS returns** | Statutory filing format complexity; out of MVP scope |
| **Actual bank NEFT file / disbursement** | Real money movement; outside scope of a software assessment |
| **Attendance & Leave Management** | Deep separate domain; LOP treated as a manual deduction if needed |
| **Email/SMS notifications** | Infrastructure dependency; not core to the problem |
| **Multi-entity / multiple companies** | ACME is a single org; HRMS multi-tenancy is out of scope |
| **Mobile app** | Web-first is sufficient; not in requirements |
| **Role Hierarchy beyond HR Admin / Viewer** | Keeps auth simple; Maker-Checker can be added later |
| **Real-time FX rates** | India-only system; single currency (INR) |

---

## Project Folder Structure

```
salary-management/
├── backend/                          # NestJS application
│   ├── src/
│   │   ├── auth/                     # JWT auth module
│   │   ├── employees/                # Employee CRUD + salary
│   │   │   ├── employees.controller.ts
│   │   │   ├── employees.service.ts
│   │   │   ├── dto/
│   │   │   └── entities/
│   │   ├── payroll/                  # Payroll periods + run engine
│   │   │   ├── payroll.controller.ts
│   │   │   ├── payroll.service.ts
│   │   │   ├── payroll-calculation.service.ts   ← Core engine
│   │   │   └── entities/
│   │   ├── reports/                  # Analytics + exports
│   │   ├── departments/
│   │   ├── audit/                    # Audit log interceptor
│   │   ├── common/                   # Pagination, response transform
│   │   ├── config/                   # DB, Redis, JWT config
│   │   └── database/
│   │       ├── migrations/           # TypeORM migrations
│   │       └── seeds/                # Seed script (10,000 employees)
│   └── test/
│       ├── unit/
│       └── e2e/
│
├── frontend/                         # React + Vite application
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Employees/
│   │   │   │   ├── EmployeeList.tsx
│   │   │   │   ├── EmployeeDetail.tsx
│   │   │   │   └── EmployeeForm.tsx
│   │   │   ├── Payroll/
│   │   │   │   ├── PayrollList.tsx
│   │   │   │   ├── PayrollDetail.tsx
│   │   │   │   └── PayslipView.tsx
│   │   │   ├── Reports.tsx
│   │   │   ├── Departments.tsx
│   │   │   └── AuditLogs.tsx
│   │   ├── components/               # Shared UI components
│   │   ├── hooks/                    # React Query hooks
│   │   ├── api/                      # Axios API client
│   │   └── lib/                      # Utilities, formatters (INR, dates)
│   └── ...
│
├── docker-compose.yml                # PostgreSQL + Redis
├── SYSTEM_DESIGN.md                  # This document
├── TASKS.md                          # Execution task list
└── README.md
```
