import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PayrollService } from './payroll.service.js';
import { PayrollPeriodStatus } from '../entities/payroll-period.entity.js';
import { EmploymentStatus } from '../entities/employee.entity.js';
import { Payslip } from '../entities/payslip.entity.js';

describe('PayrollService', () => {
  let service: PayrollService;
  let mockPeriodRepo: any;
  let mockPayslipRepo: any;
  let mockItemRepo: any;
  let mockEmployeeRepo: any;
  let mockSalaryRepo: any;
  let mockAuditRepo: any;
  let mockCalcService: any;
  let mockDataSource: any;
  let mockQueryRunner: any;

  const mockPeriod = {
    id: 'period-uuid-1',
    periodName: 'October 2026',
    fiscalYear: '2026-27',
    month: 10,
    year: 2026,
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    status: PayrollPeriodStatus.OPEN,
    totalEmployees: null,
    totalGross: null,
    totalNet: null,
    runAt: null,
    lockedAt: null,
  };

  const mockEmployeesWithSalary = [
    {
      id: 'emp-1',
      firstName: 'Aarav',
      lastName: 'Patel',
      gender: 'MALE',
      workState: 'Maharashtra',
      workCity: 'Mumbai',
      employmentStatus: EmploymentStatus.ACTIVE,
      currentSalary: {
        id: 'sal-1',
        annualCtc: 1200000,
        basicMonthly: 40000,
        hraMonthly: 20000,
        ltaMonthly: 1670,
        specialAllowance: 34506,
        otherAllowances: 0,
      },
    },
    {
      id: 'emp-2',
      firstName: 'Diya',
      lastName: 'Iyer',
      gender: 'FEMALE',
      workState: 'Karnataka',
      workCity: 'Bengaluru',
      employmentStatus: EmploymentStatus.ACTIVE,
      currentSalary: {
        id: 'sal-2',
        annualCtc: 900000,
        basicMonthly: 30000,
        hraMonthly: 15000,
        ltaMonthly: 1253,
        specialAllowance: 25881,
        otherAllowances: 0,
      },
    },
  ];

  beforeEach(() => {
    mockPeriodRepo = {
      findOne: vi.fn(),
      findAndCount: vi.fn(),
      create: vi.fn().mockImplementation((val) => val),
      save: vi.fn().mockImplementation((val) => Promise.resolve({ id: 'period-uuid-1', ...val })),
    };

    mockPayslipRepo = {
      count: vi.fn().mockResolvedValue(0),
      findOne: vi.fn(),
      createQueryBuilder: vi.fn(),
    };

    mockItemRepo = {
      save: vi.fn(),
    };

    mockEmployeeRepo = {
      createQueryBuilder: vi.fn(),
    };

    mockSalaryRepo = {};

    mockAuditRepo = {
      create: vi.fn().mockImplementation((val) => val),
      save: vi.fn().mockResolvedValue({}),
    };

    mockCalcService = {
      calculateForEmployee: vi.fn().mockReturnValue({
        basicMonthly: 40000,
        hraMonthly: 20000,
        ltaMonthly: 1670,
        specialAllowance: 34506,
        otherAllowances: 0,
        grossEarnings: 96176,
        employeePf: 1800,
        employeeEsi: 0,
        professionalTax: 200,
        tds: 5000,
        totalDeductions: 7000,
        netPay: 89176,
        employerPf: 1800,
        employerEsi: 0,
        gratuityProv: 1924,
        monthlyCtc: 99900,
        items: [
          { itemType: 'EARNING', itemName: 'Basic Salary', amount: 40000, sortOrder: 1 },
          { itemType: 'DEDUCTION', itemName: 'EPF', amount: 1800, sortOrder: 2 },
        ],
      }),
    };

    mockQueryRunner = {
      connect: vi.fn().mockResolvedValue(undefined),
      startTransaction: vi.fn().mockResolvedValue(undefined),
      commitTransaction: vi.fn().mockResolvedValue(undefined),
      rollbackTransaction: vi.fn().mockResolvedValue(undefined),
      release: vi.fn().mockResolvedValue(undefined),
      manager: {
        delete: vi.fn().mockResolvedValue({}),
        create: vi.fn().mockImplementation((cls, data) => ({ id: 'mock-id', ...data })),
        save: vi.fn().mockImplementation((clsOrData, data) => Promise.resolve(data || clsOrData)),
        createQueryBuilder: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnThis(),
          into: vi.fn().mockReturnThis(),
          values: vi.fn().mockReturnThis(),
          execute: vi.fn().mockResolvedValue({}),
        }),
      },
    };

    mockDataSource = {
      createQueryRunner: vi.fn().mockReturnValue(mockQueryRunner),
    };

    service = new PayrollService(
      mockPeriodRepo,
      mockPayslipRepo,
      mockItemRepo,
      mockEmployeeRepo,
      mockSalaryRepo,
      mockAuditRepo,
      mockCalcService,
      mockDataSource,
    );
  });

  describe('create period', () => {
    it('should create an OPEN period with correct fiscal year for November 2026', async () => {
      mockPeriodRepo.findOne.mockResolvedValue(null);

      const result = await service.create({
        month: 11,
        year: 2026,
        startDate: '2026-11-01',
        endDate: '2026-11-30',
      });

      expect(result.periodName).toBe('November 2026');
      expect(result.fiscalYear).toBe('2026-27');
      expect(result.status).toBe(PayrollPeriodStatus.OPEN);
      expect(mockPeriodRepo.save).toHaveBeenCalled();
    });

    it('should calculate correct fiscal year for February 2027 (Jan-Mar rule)', async () => {
      mockPeriodRepo.findOne.mockResolvedValue(null);

      const result = await service.create({
        month: 2,
        year: 2027,
        startDate: '2027-02-01',
        endDate: '2027-02-28',
      });

      expect(result.fiscalYear).toBe('2026-27');
    });

    it('should throw ConflictException if period already exists for month/year', async () => {
      mockPeriodRepo.findOne.mockResolvedValue(mockPeriod);

      await expect(
        service.create({
          month: 10,
          year: 2026,
          startDate: '2026-10-01',
          endDate: '2026-10-31',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('runPayroll', () => {
    it('should process all active employees and update period totals', async () => {
      mockPeriodRepo.findOne.mockResolvedValue({ ...mockPeriod });
      mockPayslipRepo.count.mockResolvedValue(0);

      const mockEmpQb = {
        innerJoinAndMapOne: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue(mockEmployeesWithSalary),
      };
      mockEmployeeRepo.createQueryBuilder.mockReturnValue(mockEmpQb);

      const result = await service.runPayroll('period-uuid-1', 'admin-user');

      expect(result.totalEmployees).toBe(2);
      expect(result.totalGross).toBe(96176 * 2);
      expect(result.totalNet).toBe(89176 * 2);
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw BadRequestException if period is LOCKED', async () => {
      mockPeriodRepo.findOne.mockResolvedValue({
        ...mockPeriod,
        status: PayrollPeriodStatus.LOCKED,
      });

      await expect(service.runPayroll('period-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow re-running payroll on an unlocked period and delete old payslips', async () => {
      mockPeriodRepo.findOne.mockResolvedValue({
        ...mockPeriod,
        status: PayrollPeriodStatus.PROCESSING,
      });

      const mockEmpQb = {
        innerJoinAndMapOne: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue(mockEmployeesWithSalary),
      };
      mockEmployeeRepo.createQueryBuilder.mockReturnValue(mockEmpQb);

      const result = await service.runPayroll('period-uuid-1', 'admin-user');

      expect(result.totalEmployees).toBe(2);
      expect(mockQueryRunner.manager.delete).toHaveBeenCalledWith(Payslip, { periodId: 'period-uuid-1' });
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });
  });

  describe('lockPayroll', () => {
    it('should lock an executed period and record lockedAt timestamp', async () => {
      const executedPeriod = {
        ...mockPeriod,
        runAt: new Date(),
        totalEmployees: 10,
      };
      mockPeriodRepo.findOne.mockResolvedValue(executedPeriod);

      const result = await service.lockPayroll('period-uuid-1', 'admin-id');

      expect(result.status).toBe(PayrollPeriodStatus.LOCKED);
      expect(result.lockedAt).toBeDefined();
      expect(mockPeriodRepo.save).toHaveBeenCalled();
      expect(mockAuditRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if period has not been run', async () => {
      mockPeriodRepo.findOne.mockResolvedValue({
        ...mockPeriod,
        runAt: null,
      });

      await expect(service.lockPayroll('period-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if period is already LOCKED', async () => {
      mockPeriodRepo.findOne.mockResolvedValue({
        ...mockPeriod,
        status: PayrollPeriodStatus.LOCKED,
        runAt: new Date(),
      });

      await expect(service.lockPayroll('period-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
