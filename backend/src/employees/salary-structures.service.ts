import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, IsNull } from 'typeorm';
import { Employee, EmploymentStatus } from '../entities/employee.entity.js';
import { SalaryStructure, RevisionReason } from '../entities/salary-structure.entity.js';
import { AuditLog, AuditAction } from '../entities/audit-log.entity.js';
import { CreateSalaryRevisionDto } from './dto/create-salary-revision.dto.js';
import { calculateSalaryBreakup } from '../common/salary-calculator.util.js';
import { CacheService } from '../common/cache.service.js';

@Injectable()
export class SalaryStructuresService {
  constructor(
    @InjectRepository(SalaryStructure)
    private readonly salaryRepository: Repository<SalaryStructure>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
    private readonly dataSource: DataSource,
    private readonly cacheService?: CacheService,
  ) {}

  async createRevision(
    dto: CreateSalaryRevisionDto,
    userId?: string,
  ): Promise<SalaryStructure> {
    const employee = await this.employeeRepository.findOne({
      where: { id: dto.employeeId },
    });

    if (!employee) {
      throw new NotFoundException(
        `Employee with ID "${dto.employeeId}" not found`,
      );
    }

    if (employee.employmentStatus === EmploymentStatus.TERMINATED) {
      throw new BadRequestException(
        'Cannot revise or update salary for a terminated employee. The record is permanently frozen.',
      );
    }

    // Find currently active salary structure
    const currentStructure = await this.salaryRepository.findOne({
      where: {
        employeeId: dto.employeeId,
        effectiveTo: IsNull(),
      },
      order: { effectiveFrom: 'DESC' },
    });

    const currentEffFrom = currentStructure
      ? (typeof currentStructure.effectiveFrom === 'string'
          ? currentStructure.effectiveFrom.split('T')[0]
          : new Date(currentStructure.effectiveFrom).toISOString().split('T')[0])
      : null;

    const dtoEffFrom = dto.effectiveFrom ? dto.effectiveFrom.split('T')[0] : null;
    const isCorrection = dto.revisionReason === RevisionReason.CORRECTION;

    if (currentStructure && currentEffFrom && !isCorrection && currentEffFrom >= dtoEffFrom!) {
      throw new BadRequestException(
        `New effective date (${dtoEffFrom}) must be after current effective date (${currentEffFrom}). Select "Administrative Rectification" (CORRECTION) to adjust the current salary.`,
      );
    }

    // Calculate previous day for closing previous structure
    const newEffDate = new Date(dto.effectiveFrom);
    const prevDate = new Date(newEffDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const effectiveToDate = prevDate.toISOString().split('T')[0];

    const breakup = calculateSalaryBreakup(dto.annualCtc, employee.workCity);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // If it's a correction or same-day adjustment, update current active structure directly
      if (currentStructure && (isCorrection || currentEffFrom === dtoEffFrom)) {
        const oldValues = {
          annualCtc: currentStructure.annualCtc,
          monthlyCtc: currentStructure.monthlyCtc,
          effectiveFrom: currentStructure.effectiveFrom,
        };

        Object.assign(currentStructure, {
          ...breakup,
          revisionReason: dto.revisionReason || RevisionReason.CORRECTION,
          remarks: dto.remarks || currentStructure.remarks,
        });

        const savedStructure = await queryRunner.manager.save(currentStructure);

        const audit = queryRunner.manager.create(AuditLog, {
          entityType: 'SALARY_STRUCTURE',
          entityId: savedStructure.id,
          action: AuditAction.UPDATE,
          oldValues,
          newValues: {
            annualCtc: savedStructure.annualCtc,
            monthlyCtc: savedStructure.monthlyCtc,
            effectiveFrom: savedStructure.effectiveFrom,
            revisionReason: savedStructure.revisionReason,
          },
          changedBy: userId || null,
        });
        await queryRunner.manager.save(audit);
        await queryRunner.commitTransaction();

        if (this.cacheService) {
          await this.cacheService.delPattern('reports:*');
        }

        return savedStructure;
      }

      // 1. Close current active structure (SCD Type 2)
      if (currentStructure) {
        currentStructure.effectiveTo = effectiveToDate;
        await queryRunner.manager.save(currentStructure);
      }

      // 2. Insert new active structure
      const newStructure = queryRunner.manager.create(SalaryStructure, {
        employeeId: dto.employeeId,
        ...breakup,
        effectiveFrom: dto.effectiveFrom,
        effectiveTo: null,
        revisionReason: dto.revisionReason,
        remarks: dto.remarks || null,
        createdBy: userId || null,
      });

      const savedNewStructure = await queryRunner.manager.save(newStructure);

      // 3. Audit log
      const audit = queryRunner.manager.create(AuditLog, {
        entityType: 'SALARY_STRUCTURE',
        entityId: savedNewStructure.id,
        action: AuditAction.UPDATE,
        oldValues: currentStructure
          ? {
              annualCtc: currentStructure.annualCtc,
              monthlyCtc: currentStructure.monthlyCtc,
              effectiveFrom: currentStructure.effectiveFrom,
            }
          : null,
        newValues: {
          annualCtc: savedNewStructure.annualCtc,
          monthlyCtc: savedNewStructure.monthlyCtc,
          effectiveFrom: savedNewStructure.effectiveFrom,
          revisionReason: dto.revisionReason,
        },
        changedBy: userId || null,
      });
      await queryRunner.manager.save(audit);

      await queryRunner.commitTransaction();

      if (this.cacheService) {
        await this.cacheService.delPattern('reports:*');
      }

      return savedNewStructure;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findOne(id: string): Promise<SalaryStructure> {
    const structure = await this.salaryRepository.findOne({
      where: { id },
      relations: { employee: true, creator: true },
    });

    if (!structure) {
      throw new NotFoundException(`Salary structure with ID "${id}" not found`);
    }

    return structure;
  }
}
