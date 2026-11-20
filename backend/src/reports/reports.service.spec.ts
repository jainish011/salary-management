import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReportsService } from './reports.service.js';
import { PayrollPeriodStatus } from '../entities/payroll-period.entity.js';

describe('ReportsService', () => {
  let service: ReportsService;
  let mockEmployeeRepo: any;
  let mockDeptRepo: any;
  let mockSalaryRepo: any;
  let mockPeriodRepo: any;
  let mockAuditRepo: any;

  beforeEach(() => {
    mockEmployeeRepo = {
      count: vi.fn().mockResolvedValue(9028),
      createQueryBuilder: vi.fn(),
    };

    mockDeptRepo = {
      createQueryBuilder: vi.fn(),
    };

    mockSalaryRepo = {};

    mockPeriodRepo = {
      findOne: vi.fn(),
      createQueryBuilder: vi.fn(),
    };

    mockAuditRepo = {
      find: vi.fn().mockResolvedValue([]),
    };

    service = new ReportsService(
      mockEmployeeRepo,
      mockDeptRepo,
      mockSalaryRepo,
      mockPeriodRepo,
      mockAuditRepo,
    );
  });

  describe('getDashboard', () => {
    it('should aggregate active employee count, latest locked payroll, and current period', async () => {
      mockPeriodRepo.findOne
        .mockResolvedValueOnce({
          id: 'p-1',
          periodName: 'October 2026',
          status: PayrollPeriodStatus.LOCKED,
          totalNet: 902288630,
        })
        .mockResolvedValueOnce({
          id: 'p-2',
          periodName: 'November 2026',
          status: PayrollPeriodStatus.OPEN,
          fiscalYear: '2026-27',
        });

      mockAuditRepo.find.mockResolvedValueOnce([
        {
          id: '1',
          entityId: 'sal-1',
          action: 'UPDATE',
          newValues: { annualCtc: 1500000 },
          changedByName: 'Admin',
          createdAt: new Date(),
        },
      ]);

      const result = await service.getDashboard();

      expect(result.totalActiveEmployees).toBe(9028);
      expect(result.totalMonthlyPayroll).toBe(902288630);
      expect(result.currentPeriod?.name).toBe('November 2026');
      expect(result.recentRevisions).toHaveLength(1);
    });
  });

  describe('getSalaryDistribution', () => {
    it('should return all standard salary bands', async () => {
      const mockRaw = [
        { band: '< 3 LPA', count: '100' },
        { band: '3 - 6 LPA', count: '500' },
        { band: '6 - 10 LPA', count: '1500' },
        { band: '10 - 15 LPA', count: '2500' },
        { band: '15 - 25 LPA', count: '3000' },
        { band: '25+ LPA', count: '1428' },
      ];

      const mockQb = {
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        getRawMany: vi.fn().mockResolvedValue(mockRaw),
      };

      mockEmployeeRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getSalaryDistribution();

      expect(result).toHaveLength(6);
      expect(result[0].band).toBe('< 3 LPA');
      expect(result[0].count).toBe(100);
      expect(result[5].band).toBe('25+ LPA');
      expect(result[5].count).toBe(1428);
    });
  });

  describe('getHeadcountByCity', () => {
    it('should return headcount grouped by city', async () => {
      const mockRaw = [
        { city: 'Bengaluru', count: '3500' },
        { city: 'Mumbai', count: '2500' },
      ];

      const mockQb = {
        where: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getRawMany: vi.fn().mockResolvedValue(mockRaw),
      };

      mockEmployeeRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getHeadcountByCity();

      expect(result).toHaveLength(2);
      expect(result[0].city).toBe('Bengaluru');
      expect(result[0].count).toBe(3500);
    });
  });
});
