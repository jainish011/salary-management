import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { EmployeesService } from './employees.service.js';
import { EmploymentStatus, TaxRegime } from '../entities/employee.entity.js';
import { calculateSalaryBreakup } from '../common/salary-calculator.util.js';

describe('EmployeesService', () => {
  let service: EmployeesService;
  let mockEmployeeRepo: any;
  let mockSalaryRepo: any;
  let mockPayslipRepo: any;
  let mockAuditRepo: any;
  let mockDataSource: any;
  let mockQueryRunner: any;

  const mockEmployee = {
    id: 'emp-uuid-1',
    employeeCode: 'EMP000001',
    firstName: 'Arun',
    lastName: 'Sharma',
    email: 'arun.sharma@acme.com',
    phone: '9876543210',
    dateOfBirth: '1990-05-15',
    gender: 'MALE',
    dateOfJoining: '2023-01-10',
    designation: 'Senior Engineer',
    grade: 'L4',
    employmentStatus: EmploymentStatus.ACTIVE,
    workCity: 'Mumbai',
    workState: 'Maharashtra',
    taxRegime: TaxRegime.NEW,
    departmentId: 'dept-uuid-1',
  };

  const mockSalary = {
    id: 'sal-uuid-1',
    employeeId: 'emp-uuid-1',
    annualCtc: 1200000,
    monthlyCtc: 100000,
    basicMonthly: 40000,
    hraMonthly: 20000,
    effectiveFrom: '2023-01-10',
    effectiveTo: null,
  };

  beforeEach(() => {
    mockEmployeeRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
      count: vi.fn().mockResolvedValue(100),
      save: vi.fn(),
      createQueryBuilder: vi.fn(),
    };

    mockSalaryRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
      save: vi.fn(),
    };

    mockPayslipRepo = {
      findAndCount: vi.fn(),
    };

    mockAuditRepo = {
      create: vi.fn().mockImplementation((val) => val),
      save: vi.fn().mockResolvedValue({}),
    };

    mockQueryRunner = {
      connect: vi.fn().mockResolvedValue(undefined),
      startTransaction: vi.fn().mockResolvedValue(undefined),
      commitTransaction: vi.fn().mockResolvedValue(undefined),
      rollbackTransaction: vi.fn().mockResolvedValue(undefined),
      release: vi.fn().mockResolvedValue(undefined),
      manager: {
        create: vi.fn().mockImplementation((entityClass, data) => ({ ...data, id: 'mock-id' })),
        save: vi.fn().mockImplementation((data) => Promise.resolve(data)),
      },
    };

    mockDataSource = {
      createQueryRunner: vi.fn().mockReturnValue(mockQueryRunner),
    };

    service = new EmployeesService(
      mockEmployeeRepo,
      mockSalaryRepo,
      mockPayslipRepo,
      mockAuditRepo,
      mockDataSource,
    );
  });

  describe('Salary Breakup Calculation Utility', () => {
    it('should compute metro HRA at 50% of Basic for Mumbai', () => {
      const annualCtc = 1200000;
      const breakup = calculateSalaryBreakup(annualCtc, 'Mumbai');

      expect(breakup.annualCtc).toBe(1200000);
      expect(breakup.monthlyCtc).toBe(100000);
      expect(breakup.basicMonthly).toBe(40000); // 40% of 100k
      expect(breakup.hraMonthly).toBe(20000); // 50% of Basic in metro
      expect(breakup.employerPfMonthly).toBe(1800); // capped at 15000 * 0.12 = 1800
      expect(breakup.gratuityMonthly).toBe(1924); // 40000 * 0.0481 = 1924
      const totalEarningsAndRetirals =
        breakup.basicMonthly +
        breakup.hraMonthly +
        breakup.ltaMonthly +
        breakup.specialAllowance +
        breakup.employerPfMonthly +
        breakup.gratuityMonthly;
      expect(totalEarningsAndRetirals).toBe(breakup.monthlyCtc);
    });

    it('should compute non-metro HRA at 40% of Basic for Pune', () => {
      const annualCtc = 600000;
      const breakup = calculateSalaryBreakup(annualCtc, 'Pune');

      expect(breakup.monthlyCtc).toBe(50000);
      expect(breakup.basicMonthly).toBe(20000);
      expect(breakup.hraMonthly).toBe(8000); // 40% of Basic in non-metro
      expect(breakup.employerPfMonthly).toBe(1800); // capped at 15000 * 0.12
    });
  });

  describe('findAll', () => {
    it('should return paginated list with totalPages meta', async () => {
      const mockQb = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        leftJoinAndMapOne: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        addOrderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([[mockEmployee], 100]),
      };

      mockEmployeeRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.total).toBe(100);
      expect(result.meta.totalPages).toBe(10);
      expect(mockQb.skip).toHaveBeenCalledWith(10);
      expect(mockQb.take).toHaveBeenCalledWith(10);
    });
  });

  describe('findOne', () => {
    it('should return employee with currentSalary', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue(mockEmployee);
      mockSalaryRepo.findOne.mockResolvedValue(mockSalary);

      const result = await service.findOne('emp-uuid-1');

      expect(result.id).toBe('emp-uuid-1');
      expect(result.currentSalary).toEqual(mockSalary);
    });

    it('should throw NotFoundException if employee not found', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should generate employee code and create employee with initial salary structure', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue(null);
      mockEmployeeRepo.count.mockResolvedValue(42);

      const dto: any = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@acme.com',
        phone: '9988776655',
        dateOfBirth: '1992-04-10',
        gender: 'MALE',
        dateOfJoining: '2024-02-01',
        designation: 'Software Engineer',
        grade: 'L3',
        workCity: 'Bengaluru',
        workState: 'Karnataka',
        departmentId: 'dept-1',
        annualCtc: 900000,
      };

      const result = await service.create(dto, 'user-admin-1');

      expect(result).toBeDefined();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue(mockEmployee);

      const dto: any = {
        firstName: 'Duplicate',
        lastName: 'User',
        email: 'arun.sharma@acme.com',
      };

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('softDelete', () => {
    it('should mark employee as TERMINATED with dateOfLeaving', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue({ ...mockEmployee });
      mockEmployeeRepo.save.mockImplementation((emp: any) => Promise.resolve(emp));

      const result = await service.softDelete('emp-uuid-1', 'admin-id');

      expect(result.employmentStatus).toBe(EmploymentStatus.TERMINATED);
      expect(result.dateOfLeaving).toBeDefined();
      expect(mockEmployeeRepo.save).toHaveBeenCalled();
      expect(mockAuditRepo.save).toHaveBeenCalled();
    });
  });
});
