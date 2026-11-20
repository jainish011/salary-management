# ACME Salary Management System

A web-based salary management portal for ACME org's HR team to manage salary data for 10,000 employees across India — replacing Excel-based workflows.

## Overview

Built for the HR Manager persona, this system handles:
- Employee master data with org hierarchy
- CTC-based salary structures with Indian statutory deductions (PF, ESI, PT, TDS)
- Monthly payroll run with payslip generation
- Salary revision history (SCD Type 2)
- HR analytics dashboard with payroll insights
- Audit trail for all changes

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| UI | shadcn/ui + Tailwind CSS |
| State | TanStack Query |
| Backend | NestJS (Node.js + TypeScript) |
| ORM | TypeORM |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Auth | JWT + bcrypt |

## Prerequisites

- Node.js 20+
- Docker + Docker Compose
- npm 10+

## Local Setup

### 1. Clone & Install

```bash
git clone <repo-url>
cd salary-management

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Setup

```bash
# Copy env example and fill in values
cp .env.example .env
```

### 3. Start Infrastructure (PostgreSQL + Redis)

```bash
# From repo root
docker-compose up -d
```

### 4. Run Database Migrations

```bash
cd backend
npm run migration:run
```

### 5. Seed the Database (10,000 employees)

```bash
cd backend
npm run seed
```

### 6. Start Development Servers

```bash
# Terminal 1 — Backend (port 3000)
cd backend
npm run start:dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

### 7. Access the App

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api/v1
- API Health: http://localhost:3000/api/v1/health

### Default Login

| Field | Value |
|---|---|
| Email | `admin@acme.com` |
| Password | `Admin@123` |

## Documentation

- [System Design](./SYSTEM_DESIGN.md) — Full HLD + LLD, DB schema, API design, caching strategy
- [Task Tracker](./TASKS.md) — Implementation checklist by phase

## Project Structure

```
salary-management/
├── backend/          # NestJS API server
├── frontend/         # React + Vite app
├── docker-compose.yml
├── .env.example
├── SYSTEM_DESIGN.md
├── TASKS.md
└── README.md
```
