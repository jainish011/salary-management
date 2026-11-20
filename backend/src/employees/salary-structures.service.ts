import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, IsNull } from 'typeorm';
import { Employee } from '../entities/employee.entity.js';
import { SalaryStructure } from '../entities/salary-structure.entity.js';
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

    // Find currently active salary structure
    const currentStructure = await this.salaryRepository.findOne({
      where: {
        employeeId: dto.employeeId,
        effectiveTo: IsNull(),
      },
      order: { effectiveFrom: 'DESC' },
    });

    if (currentStructure && currentStructure.effectiveFrom >= dto.effectiveFrom) {
      throw new BadRequestException(
        `New effective date (${dto.effectiveFrom}) must be after current effective date (${currentStructure.effectiveFrom})`,
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
