import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee, EmploymentStatus } from '../entities/employee.entity.js';
import { Department } from '../entities/department.entity.js';
import { SalaryStructure } from '../entities/salary-structure.entity.js';
import {
  PayrollPeriod,
  PayrollPeriodStatus,
} from '../entities/payroll-period.entity.js';
import { AuditLog } from '../entities/audit-log.entity.js';
import { CacheService } from '../common/cache.service.js';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(SalaryStructure)
    private readonly salaryRepository: Repository<SalaryStructure>,
    @InjectRepository(PayrollPeriod)
    private readonly periodRepository: Repository<PayrollPeriod>,
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
    private readonly cacheService?: CacheService,
  ) {}

  async getDashboard() {
    const cacheKey = 'reports:dashboard';
    if (this.cacheService) {
      const cached = await this.cacheService.get<any>(cacheKey);
      if (cached) return cached;
    }

    const totalActiveEmployees = await this.employeeRepository.count({
      where: { employmentStatus: EmploymentStatus.ACTIVE },
    });

    const latestLockedPeriod = await this.periodRepository.findOne({
      where: { status: PayrollPeriodStatus.LOCKED },
      order: { year: 'DESC', month: 'DESC' },
    });

    const latestPeriod = await this.periodRepository.findOne({
      where: {},
      order: { year: 'DESC', month: 'DESC' },
    });

    const recentRevisions = await this.auditRepository.find({
      where: { entityType: 'SALARY_STRUCTURE' },
      order: { createdAt: 'DESC' },
      take: 5,
      relations: { changer: true },
    });

    const result = {
      totalActiveEmployees,
      totalMonthlyPayroll: latestLockedPeriod ? Number(latestLockedPeriod.totalNet) : 0,
      currentPeriod: latestPeriod
        ? {
            id: latestPeriod.id,
            name: latestPeriod.periodName,
            status: latestPeriod.status,
            fiscalYear: latestPeriod.fiscalYear,
          }
        : null,
      recentRevisions: recentRevisions.map((rev) => ({
        id: rev.id,
        entityId: rev.entityId,
        action: rev.action,
        newValues: rev.newValues,
        changedByName: rev.changedByName || rev.changer?.fullName || 'System',
        createdAt: rev.createdAt,
      })),
    };

    if (this.cacheService) {
      await this.cacheService.set(cacheKey, result, 600); // 10 min
    }

    return result;
  }

  async getDepartmentSummary() {
    const cacheKey = 'reports:department-summary';
    if (this.cacheService) {
      const cached = await this.cacheService.get<any>(cacheKey);
      if (cached) return cached;
    }

    const raw = await this.departmentRepository
      .createQueryBuilder('dept')
      .leftJoin(
        Employee,
        'emp',
        'emp.departmentId = dept.id AND emp.employmentStatus = :status',
        { status: EmploymentStatus.ACTIVE },
      )
      .leftJoin(
        SalaryStructure,
        'ss',
        'ss.employeeId = emp.id AND ss.effectiveTo IS NULL',
      )
      .select('dept.id', 'departmentId')
      .addSelect('dept.name', 'departmentName')
      .addSelect('COUNT(emp.id)::int', 'headcount')
      .addSelect('COALESCE(ROUND(AVG(ss.monthlyCtc), 2), 0)::float', 'avgMonthlyCtc')
      .addSelect('COALESCE(ROUND(SUM(ss.monthlyCtc), 2), 0)::float', 'totalMonthlyCtc')
      .groupBy('dept.id')
      .addGroupBy('dept.name')
      .orderBy('headcount', 'DESC')
      .getRawMany();

    const result = raw.map((r) => ({
      departmentId: r.departmentId,
      departmentName: r.departmentName,
      headcount: parseInt(r.headcount, 10),
      avgMonthlyCtc: parseFloat(r.avgMonthlyCtc),
      totalMonthlyCtc: parseFloat(r.totalMonthlyCtc),
    }));

    if (this.cacheService) {
      await this.cacheService.set(cacheKey, result, 900); // 15 min
    }

    return result;
  }

  async getSalaryDistribution() {
    const raw = await this.employeeRepository
      .createQueryBuilder('emp')
      .innerJoin(
        SalaryStructure,
        'ss',
        'ss.employeeId = emp.id AND ss.effectiveTo IS NULL',
      )
      .where('emp.employmentStatus = :status', { status: EmploymentStatus.ACTIVE })
      .select(`
        CASE
          WHEN ss.annualCtc < 300000 THEN '< 3 LPA'
          WHEN ss.annualCtc >= 300000 AND ss.annualCtc < 600000 THEN '3 - 6 LPA'
          WHEN ss.annualCtc >= 600000 AND ss.annualCtc < 1000000 THEN '6 - 10 LPA'
          WHEN ss.annualCtc >= 1000000 AND ss.annualCtc < 1500000 THEN '10 - 15 LPA'
          WHEN ss.annualCtc >= 1500000 AND ss.annualCtc < 2500000 THEN '15 - 25 LPA'
          ELSE '25+ LPA'
        END
      `, 'band')
      .addSelect('COUNT(emp.id)::int', 'count')
      .groupBy('band')
      .getRawMany();

    // Standard ordering for histogram
    const orderedBands = [
      '< 3 LPA',
      '3 - 6 LPA',
      '6 - 10 LPA',
      '10 - 15 LPA',
      '15 - 25 LPA',
      '25+ LPA',
    ];

    const bandMap = new Map<string, number>();
    raw.forEach((r) => bandMap.set(r.band, parseInt(r.count, 10)));

    return orderedBands.map((band) => ({
      band,
      count: bandMap.get(band) || 0,
    }));
  }

  async getPayrollTrend(months = 6) {
    const periods = await this.periodRepository
      .createQueryBuilder('p')
      .where('p.runAt IS NOT NULL')
      .orderBy('p.year', 'DESC')
      .addOrderBy('p.month', 'DESC')
      .take(months)
      .getMany();

    // Return chronological order
    periods.reverse();

    return periods.map((p) => ({
      periodId: p.id,
      periodName: p.periodName,
      month: p.month,
      year: p.year,
      totalGross: Number(p.totalGross || 0),
      totalNet: Number(p.totalNet || 0),
      totalPf: Number(p.totalPf || 0),
      totalTds: Number(p.totalTds || 0),
      totalEmployees: p.totalEmployees || 0,
      status: p.status,
    }));
  }

  async getGradeSummary() {
    const raw = await this.employeeRepository
      .createQueryBuilder('emp')
      .innerJoin(
        SalaryStructure,
        'ss',
        'ss.employeeId = emp.id AND ss.effectiveTo IS NULL',
      )
      .where('emp.employmentStatus = :status', { status: EmploymentStatus.ACTIVE })
      .select('emp.grade', 'grade')
      .addSelect('COUNT(emp.id)::int', 'count')
      .addSelect('ROUND(MIN(ss.annualCtc), 2)::float', 'minCtc')
      .addSelect('ROUND(AVG(ss.annualCtc), 2)::float', 'avgCtc')
      .addSelect('ROUND(MAX(ss.annualCtc), 2)::float', 'maxCtc')
      .groupBy('emp.grade')
      .orderBy('emp.grade', 'ASC')
      .getRawMany();

    return raw.map((r) => ({
      grade: r.grade,
      count: parseInt(r.count, 10),
      minCtc: parseFloat(r.minCtc),
      avgCtc: parseFloat(r.avgCtc),
      maxCtc: parseFloat(r.maxCtc),
    }));
  }

  async getHeadcountByCity() {
    const raw = await this.employeeRepository
      .createQueryBuilder('emp')
      .where('emp.employmentStatus = :status', { status: EmploymentStatus.ACTIVE })
      .select('emp.workCity', 'city')
      .addSelect('COUNT(emp.id)::int', 'count')
      .groupBy('emp.workCity')
      .orderBy('count', 'DESC')
      .getRawMany();

    return raw.map((r) => ({
      city: r.city,
      count: parseInt(r.count, 10),
    }));
  }

  async exportEmployeesCsv(): Promise<string> {
    const employees = await this.employeeRepository
      .createQueryBuilder('emp')
      .leftJoinAndSelect('emp.department', 'dept')
      .innerJoinAndMapOne(
        'emp.currentSalary',
        SalaryStructure,
        'ss',
        'ss.employeeId = emp.id AND ss.effectiveTo IS NULL',
      )
      .where('emp.employmentStatus = :status', { status: EmploymentStatus.ACTIVE })
      .orderBy('emp.employeeCode', 'ASC')
      .getMany();

    const headers = [
      'Employee Code',
      'First Name',
      'Last Name',
      'Email',
      'Department',
      'Designation',
      'Grade',
      'Work City',
      'Work State',
      'Tax Regime',
      'Date of Joining',
      'Annual CTC (INR)',
      'Monthly CTC (INR)',
      'Basic Monthly (INR)',
      'HRA Monthly (INR)',
    ];

    const rows = employees.map((emp) => {
      const s = (emp as any).currentSalary || {};
      return [
        emp.employeeCode,
        `"${emp.firstName}"`,
        `"${emp.lastName}"`,
        emp.email,
        `"${emp.department?.name || ''}"`,
        `"${emp.designation}"`,
        emp.grade,
        emp.workCity,
        emp.workState,
        emp.taxRegime,
        emp.dateOfJoining,
        s.annualCtc || 0,
        s.monthlyCtc || 0,
        s.basicMonthly || 0,
        s.hraMonthly || 0,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}
