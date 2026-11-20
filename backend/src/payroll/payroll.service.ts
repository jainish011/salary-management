import crypto from 'crypto';
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, IsNull } from 'typeorm';
import {
  PayrollPeriod,
  PayrollPeriodStatus,
} from '../entities/payroll-period.entity.js';
import { Payslip } from '../entities/payslip.entity.js';
import { PayslipItem } from '../entities/payslip-item.entity.js';
import { Employee, EmploymentStatus } from '../entities/employee.entity.js';
import { SalaryStructure } from '../entities/salary-structure.entity.js';
import { AuditLog, AuditAction } from '../entities/audit-log.entity.js';
import { PayrollCalculationService } from './payroll-calculation.service.js';
import { CreatePayrollPeriodDto } from './dto/create-payroll-period.dto.js';
import { PeriodPayslipsQueryDto } from './dto/period-payslips-query.dto.js';
import { PaginatedResponse } from '../common/pagination.dto.js';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

@Injectable()
export class PayrollService {
  constructor(
    @InjectRepository(PayrollPeriod)
    private readonly periodRepository: Repository<PayrollPeriod>,
    @InjectRepository(Payslip)
    private readonly payslipRepository: Repository<Payslip>,
    @InjectRepository(PayslipItem)
    private readonly itemRepository: Repository<PayslipItem>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(SalaryStructure)
    private readonly salaryRepository: Repository<SalaryStructure>,
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
    private readonly calculationService: PayrollCalculationService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(page = 1, limit = 20): Promise<PaginatedResponse<PayrollPeriod>> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.periodRepository.findAndCount({
      order: { year: 'DESC', month: 'DESC' },
      skip,
      take: limit,
      relations: { creator: true },
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<PayrollPeriod> {
    const period = await this.periodRepository.findOne({
      where: { id },
      relations: { creator: true },
    });

    if (!period) {
      throw new NotFoundException(`Payroll period with ID "${id}" not found`);
    }

    return period;
  }

  async create(dto: CreatePayrollPeriodDto, userId?: string): Promise<PayrollPeriod> {
    const existing = await this.periodRepository.findOne({
      where: { month: dto.month, year: dto.year },
    });

    if (existing) {
      throw new ConflictException(
        `Payroll period for ${MONTH_NAMES[dto.month - 1]} ${dto.year} already exists`,
      );
    }

    // Fiscal year: April to March
    const fyStart = dto.month >= 4 ? dto.year : dto.year - 1;
    const fyEnd = (fyStart + 1).toString().slice(-2);
    const fiscalYear = `${fyStart}-${fyEnd}`;
    const periodName = `${MONTH_NAMES[dto.month - 1]} ${dto.year}`;

    const period = this.periodRepository.create({
      ...dto,
      periodName,
      fiscalYear,
      status: PayrollPeriodStatus.OPEN,
      createdBy: userId || null,
    });

    const saved = await this.periodRepository.save(period);

    await this.auditRepository.save(
      this.auditRepository.create({
        entityType: 'PAYROLL_PERIOD',
        entityId: saved.id,
        action: AuditAction.CREATE,
        newValues: { periodName, fiscalYear },
        changedBy: userId || null,
      }),
    );

    return saved;
  }

  async runPayroll(periodId: string, userId?: string) {
    const startTime = Date.now();
    const period = await this.periodRepository.findOne({ where: { id: periodId } });

    if (!period) {
      throw new NotFoundException(`Payroll period with ID "${periodId}" not found`);
    }

    if (period.status === PayrollPeriodStatus.LOCKED) {
      throw new BadRequestException('Cannot run payroll on a LOCKED period');
    }

    const existingPayslipsCount = await this.payslipRepository.count({
      where: { periodId },
    });

    if (existingPayslipsCount > 0) {
      throw new BadRequestException(
        'Payroll has already been processed for this period. Re-run is not permitted on non-empty period.',
      );
    }

    // Update status to PROCESSING
    period.status = PayrollPeriodStatus.PROCESSING;
    await this.periodRepository.save(period);

    // Fetch all active employees with active salary structures
    const employees = await this.employeeRepository
      .createQueryBuilder('emp')
      .innerJoinAndMapOne(
        'emp.currentSalary',
        SalaryStructure,
        'ss',
        'ss.employeeId = emp.id AND ss.effectiveTo IS NULL',
      )
      .where('emp.employmentStatus = :status', { status: EmploymentStatus.ACTIVE })
      .getMany();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let totalGross = 0;
    let totalNet = 0;
    let totalPf = 0;
    let totalTds = 0;

    try {
      // Process in chunks of 500 with batch inserts for high performance
      const CHUNK_SIZE = 500;
      for (let i = 0; i < employees.length; i += CHUNK_SIZE) {
        const chunk = employees.slice(i, i + CHUNK_SIZE);
        const payslipsToInsert: any[] = [];
        const itemsToInsert: any[] = [];

        for (const emp of chunk) {
          const currentSalary: SalaryStructure = (emp as any).currentSalary;
          if (!currentSalary) continue;

          const calc = this.calculationService.calculateForEmployee(
            emp,
            currentSalary,
            { month: period.month, year: period.year },
          );

          totalGross += calc.grossEarnings;
          totalNet += calc.netPay;
          totalPf += calc.employeePf;
          totalTds += calc.tds;

          const payslipId = crypto.randomUUID();
          payslipsToInsert.push({
            id: payslipId,
            employeeId: emp.id,
            periodId: period.id,
            grossEarnings: calc.grossEarnings,
            totalDeductions: calc.totalDeductions,
            netPay: calc.netPay,
            employeePf: calc.employeePf,
            employeeEsi: calc.employeeEsi,
            professionalTax: calc.professionalTax,
            tds: calc.tds,
            employerPf: calc.employerPf,
            gratuityProv: calc.gratuityProv,
            monthlyCtc: calc.monthlyCtc,
            salaryStructureId: currentSalary.id,
          });

          for (const item of calc.items) {
            itemsToInsert.push({
              id: crypto.randomUUID(),
              payslipId: payslipId,
              itemType: item.itemType,
              itemName: item.itemName,
              amount: item.amount,
              sortOrder: item.sortOrder,
            });
          }
        }

        // Bulk insert payslips for chunk
        if (payslipsToInsert.length > 0) {
          await queryRunner.manager
            .createQueryBuilder()
            .insert()
            .into(Payslip)
            .values(payslipsToInsert)
            .execute();
        }

        // Bulk insert items in batches of 1000 for PostgreSQL parameter limit
        const ITEM_CHUNK = 1000;
        for (let j = 0; j < itemsToInsert.length; j += ITEM_CHUNK) {
          const itemSubChunk = itemsToInsert.slice(j, j + ITEM_CHUNK);
          await queryRunner.manager
            .createQueryBuilder()
            .insert()
            .into(PayslipItem)
            .values(itemSubChunk)
            .execute();
        }
      }

      // Update Period Summary
      period.status = PayrollPeriodStatus.OPEN;
      period.totalEmployees = employees.length;
      period.totalGross = totalGross;
      period.totalNet = totalNet;
      period.totalPf = totalPf;
      period.totalTds = totalTds;
      period.runAt = new Date();

      await queryRunner.manager.save(period);

      // Audit Log
      await queryRunner.manager.save(
        queryRunner.manager.create(AuditLog, {
          entityType: 'PAYROLL_PERIOD',
          entityId: period.id,
          action: AuditAction.UPDATE,
          newValues: {
            event: 'PAYROLL_RUN',
            totalEmployees: employees.length,
            totalGross,
            totalNet,
          },
          changedBy: userId || null,
        }),
      );

      await queryRunner.commitTransaction();

      const durationMs = Date.now() - startTime;
      return {
        periodId: period.id,
        periodName: period.periodName,
        totalEmployees: employees.length,
        totalGross,
        totalNet,
        totalPf,
        totalTds,
        durationMs,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      // Revert status to OPEN if failed
      period.status = PayrollPeriodStatus.OPEN;
      await this.periodRepository.save(period);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async lockPayroll(periodId: string, userId?: string): Promise<PayrollPeriod> {
    const period = await this.periodRepository.findOne({ where: { id: periodId } });

    if (!period) {
      throw new NotFoundException(`Payroll period with ID "${periodId}" not found`);
    }

    if (period.status === PayrollPeriodStatus.LOCKED) {
      throw new BadRequestException('Payroll period is already LOCKED');
    }

    if (!period.runAt) {
      throw new BadRequestException('Cannot lock a period that has not been run');
    }

    period.status = PayrollPeriodStatus.LOCKED;
    period.lockedAt = new Date();

    const saved = await this.periodRepository.save(period);

    await this.auditRepository.save(
      this.auditRepository.create({
        entityType: 'PAYROLL_PERIOD',
        entityId: saved.id,
        action: AuditAction.UPDATE,
        newValues: {
          status: PayrollPeriodStatus.LOCKED,
          lockedAt: period.lockedAt,
        },
        changedBy: userId || null,
      }),
    );

    return saved;
  }

  async getPeriodPayslips(
    periodId: string,
    query: PeriodPayslipsQueryDto,
  ): Promise<PaginatedResponse<Payslip>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const qb = this.payslipRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.employee', 'emp')
      .leftJoinAndSelect('emp.department', 'dept')
      .where('p.periodId = :periodId', { periodId });

    if (query.departmentId) {
      qb.andWhere('emp.departmentId = :deptId', { deptId: query.departmentId });
    }

    if (query.search && query.search.trim()) {
      const term = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(emp.firstName) LIKE :term OR LOWER(emp.lastName) LIKE :term OR LOWER(emp.email) LIKE :term OR LOWER(emp.employeeCode) LIKE :term)',
        { term },
      );
    }

    qb.orderBy('emp.firstName', 'ASC').addOrderBy('emp.lastName', 'ASC');
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPayslipById(id: string): Promise<Payslip> {
    const payslip = await this.payslipRepository.findOne({
      where: { id },
      relations: {
        employee: { department: true },
        period: true,
        salaryStructure: true,
        items: true,
      },
      order: {
        items: {
          sortOrder: 'ASC',
        },
      },
    });

    if (!payslip) {
      throw new NotFoundException(`Payslip with ID "${id}" not found`);
    }

    return payslip;
  }
}
