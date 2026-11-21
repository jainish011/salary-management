import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, IsNull } from 'typeorm';
import { Employee, EmploymentStatus } from '../entities/employee.entity.js';
import { Department } from '../entities/department.entity.js';
import { SalaryStructure, RevisionReason } from '../entities/salary-structure.entity.js';
import { Payslip } from '../entities/payslip.entity.js';
import { AuditLog, AuditAction } from '../entities/audit-log.entity.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';
import { EmployeeQueryDto } from './dto/employee-query.dto.js';
import { PaginatedResponse } from '../common/pagination.dto.js';
import { calculateSalaryBreakup } from '../common/salary-calculator.util.js';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(SalaryStructure)
    private readonly salaryRepository: Repository<SalaryStructure>,
    @InjectRepository(Payslip)
    private readonly payslipRepository: Repository<Payslip>,
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: EmployeeQueryDto): Promise<PaginatedResponse<any>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const qb = this.employeeRepository
      .createQueryBuilder('emp')
      .leftJoinAndSelect('emp.department', 'dept')
      .leftJoinAndMapOne(
        'emp.currentSalary',
        SalaryStructure,
        'ss',
        'ss.employeeId = emp.id AND ss.effectiveTo IS NULL',
      );

    // Filters
    if (query.departmentId) {
      qb.andWhere('emp.departmentId = :deptId', { deptId: query.departmentId });
    }

    if (query.status) {
      qb.andWhere('emp.employmentStatus = :status', { status: query.status });
    }

    if (query.grade) {
      qb.andWhere('emp.grade = :grade', { grade: query.grade.toUpperCase() });
    }

    if (query.workCity) {
      qb.andWhere('LOWER(emp.workCity) = LOWER(:city)', { city: query.workCity });
    }

    if (query.workState) {
      qb.andWhere('LOWER(emp.workState) = LOWER(:state)', { state: query.workState });
    }

    if (query.ctcMin) {
      qb.andWhere('ss.annualCtc >= :ctcMin', { ctcMin: query.ctcMin });
    }

    if (query.ctcMax) {
      qb.andWhere('ss.annualCtc <= :ctcMax', { ctcMax: query.ctcMax });
    }

    // Search: matches name, email, employeeCode with GIN tsvector and ILIKE fallback
    if (query.search && query.search.trim()) {
      const cleanTerm = query.search.trim();
      const term = `%${cleanTerm.toLowerCase()}%`;
      qb.andWhere(
        `(to_tsvector('english', coalesce(emp.firstName, '') || ' ' || coalesce(emp.lastName, '') || ' ' || coalesce(emp.email, '') || ' ' || coalesce(emp.employeeCode, '')) @@ plainto_tsquery('english', :cleanTerm) OR LOWER(emp.firstName) LIKE :term OR LOWER(emp.lastName) LIKE :term OR LOWER(emp.email) LIKE :term OR LOWER(emp.employeeCode) LIKE :term)`,
        { cleanTerm, term },
      );
    }

    // Sorting
    const sortField = query.sortBy || 'firstName';
    const sortOrder = query.order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    if (sortField === 'monthlyCtc') {
      qb.orderBy('ss.monthlyCtc', sortOrder);
    } else if (sortField === 'annualCtc') {
      qb.orderBy('ss.annualCtc', sortOrder);
    } else if (sortField === 'employeeCode') {
      qb.orderBy('emp.employeeCode', sortOrder);
    } else if (sortField === 'dateOfJoining') {
      qb.orderBy('emp.dateOfJoining', sortOrder);
    } else if (sortField === 'grade') {
      qb.orderBy('emp.grade', sortOrder);
    } else {
      qb.orderBy('emp.firstName', sortOrder).addOrderBy('emp.lastName', sortOrder);
    }

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

  async findOne(id: string): Promise<any> {
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: { department: true },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID "${id}" not found`);
    }

    const currentSalary = await this.salaryRepository.findOne({
      where: {
        employeeId: id,
        effectiveTo: IsNull(),
      },
      order: { effectiveFrom: 'DESC' },
    });

    return {
      ...employee,
      currentSalary: currentSalary || null,
    };
  }

  async create(dto: CreateEmployeeDto, userId?: string): Promise<any> {
    const existing = await this.employeeRepository.findOne({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException(
        `Employee with email "${dto.email}" already exists`,
      );
    }

    if (dto.departmentId && typeof this.dataSource?.getRepository === 'function') {
      const dept = await this.dataSource.getRepository(Department).findOne({
        where: { id: dto.departmentId },
      });
      if (!dept) {
        throw new NotFoundException(`Department with ID "${dto.departmentId}" not found`);
      }
    }

    if (dto.dateOfBirth) {
      const dob = new Date(dto.dateOfBirth);
      const doj = new Date(dto.dateOfJoining);
      if (isNaN(dob.getTime())) {
        throw new BadRequestException('Invalid date of birth');
      }
      if (isNaN(doj.getTime())) {
        throw new BadRequestException('Invalid date of joining');
      }
      if (dob >= doj) {
        throw new BadRequestException('Date of birth must be before date of joining');
      }
      let age = doj.getFullYear() - dob.getFullYear();
      const m = doj.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && doj.getDate() < dob.getDate())) {
        age--;
      }
      if (age < 18) {
        throw new BadRequestException('Employee must be at least 18 years old at date of joining');
      }
    }

    if (dto.panNumber) {
      const pan = dto.panNumber.trim().toUpperCase();
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
        throw new BadRequestException('PAN must be in standard Indian format (e.g., ABCDE1234F)');
      }
      dto.panNumber = pan;
    }

    if (dto.uanNumber) {
      const uan = dto.uanNumber.trim();
      if (!/^\d{12}$/.test(uan)) {
        throw new BadRequestException('UAN must be exactly 12 digits');
      }
      dto.uanNumber = uan;
    }

    if (!dto.annualCtc || dto.annualCtc < 100000) {
      throw new BadRequestException('Annual CTC must be at least ₹1,00,000');
    }

    // Auto-generate employee code: EMP + 6 digits
    const count = await this.employeeRepository.count();
    const employeeCode = `EMP${(count + 1).toString().padStart(6, '0')}`;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const employee = queryRunner.manager.create(Employee, {
        ...dto,
        employeeCode,
        email: dto.email.toLowerCase().trim(),
        employmentStatus: dto.employmentStatus || EmploymentStatus.ACTIVE,
      });

      const savedEmployee = await queryRunner.manager.save(employee);

      // Create initial salary structure (SCD Type 2)
      const breakup = calculateSalaryBreakup(dto.annualCtc, dto.workCity);
      const salaryStructure = queryRunner.manager.create(SalaryStructure, {
        employeeId: savedEmployee.id,
        ...breakup,
        effectiveFrom: dto.dateOfJoining,
        effectiveTo: null,
        revisionReason: RevisionReason.JOINING,
        createdBy: userId || null,
      });

      const savedSalary = await queryRunner.manager.save(salaryStructure);

      // Audit log
      const audit = queryRunner.manager.create(AuditLog, {
        entityType: 'EMPLOYEE',
        entityId: savedEmployee.id,
        action: AuditAction.CREATE,
        newValues: {
          employeeCode,
          name: `${savedEmployee.firstName} ${savedEmployee.lastName}`,
          email: savedEmployee.email,
          annualCtc: dto.annualCtc,
        },
        changedBy: userId || null,
      });
      await queryRunner.manager.save(audit);

      await queryRunner.commitTransaction();

      return {
        ...savedEmployee,
        currentSalary: savedSalary,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async update(id: string, dto: UpdateEmployeeDto, userId?: string): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({ where: { id } });
    if (!employee) {
      throw new NotFoundException(`Employee with ID "${id}" not found`);
    }

    if (dto.departmentId && typeof this.dataSource?.getRepository === 'function') {
      const dept = await this.dataSource.getRepository(Department).findOne({
        where: { id: dto.departmentId },
      });
      if (!dept) {
        throw new NotFoundException(`Department with ID "${dto.departmentId}" not found`);
      }
    }

    if (dto.dateOfBirth) {
      const dob = new Date(dto.dateOfBirth);
      const doj = new Date(dto.dateOfJoining || employee.dateOfJoining);
      if (isNaN(dob.getTime())) {
        throw new BadRequestException('Invalid date of birth');
      }
      if (dob >= doj) {
        throw new BadRequestException('Date of birth must be before date of joining');
      }
      let age = doj.getFullYear() - dob.getFullYear();
      const m = doj.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && doj.getDate() < dob.getDate())) {
        age--;
      }
      if (age < 18) {
        throw new BadRequestException('Employee must be at least 18 years old at date of joining');
      }
    }

    if (dto.panNumber) {
      const pan = dto.panNumber.trim().toUpperCase();
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
        throw new BadRequestException('PAN must be in standard Indian format (e.g., ABCDE1234F)');
      }
      dto.panNumber = pan;
    }

    if (dto.uanNumber) {
      const uan = dto.uanNumber.trim();
      if (!/^\d{12}$/.test(uan)) {
        throw new BadRequestException('UAN must be exactly 12 digits');
      }
      dto.uanNumber = uan;
    }

    if (dto.email && dto.email.toLowerCase().trim() !== employee.email) {
      const existing = await this.employeeRepository.findOne({
        where: { email: dto.email.toLowerCase().trim() },
      });
      if (existing) {
        throw new ConflictException(`Email "${dto.email}" is already taken`);
      }
      employee.email = dto.email.toLowerCase().trim();
    }

    const oldValues = { ...employee };
    Object.assign(employee, dto);

    const saved = await this.employeeRepository.save(employee);

    // Record audit log
    await this.auditRepository.save(
      this.auditRepository.create({
        entityType: 'EMPLOYEE',
        entityId: saved.id,
        action: AuditAction.UPDATE,
        oldValues,
        newValues: saved,
        changedBy: userId || null,
      }),
    );

    return saved;
  }

  async softDelete(id: string, userId?: string): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({ where: { id } });
    if (!employee) {
      throw new NotFoundException(`Employee with ID "${id}" not found`);
    }

    if (employee.employmentStatus === EmploymentStatus.TERMINATED) {
      throw new BadRequestException(
        `Employee "${employee.firstName} ${employee.lastName}" is already terminated`,
      );
    }

    const today = new Date().toISOString().split('T')[0];
    employee.employmentStatus = EmploymentStatus.TERMINATED;
    employee.dateOfLeaving = today;

    const saved = await this.employeeRepository.save(employee);

    await this.auditRepository.save(
      this.auditRepository.create({
        entityType: 'EMPLOYEE',
        entityId: saved.id,
        action: AuditAction.DELETE,
        newValues: {
          status: EmploymentStatus.TERMINATED,
          dateOfLeaving: today,
        },
        changedBy: userId || null,
      }),
    );

    return saved;
  }

  async getSalaryHistory(employeeId: string): Promise<SalaryStructure[]> {
    const employee = await this.employeeRepository.findOne({ where: { id: employeeId } });
    if (!employee) {
      throw new NotFoundException(`Employee with ID "${employeeId}" not found`);
    }

    return this.salaryRepository.find({
      where: { employeeId },
      order: { effectiveFrom: 'DESC' },
      relations: { creator: true },
    });
  }

  async getPayslips(employeeId: string, page = 1, limit = 10): Promise<PaginatedResponse<Payslip>> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.payslipRepository.findAndCount({
      where: { employeeId },
      relations: { period: true },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
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
}
