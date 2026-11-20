import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SalaryStructuresService } from './salary-structures.service.js';
import { RevisionReason } from '../entities/salary-structure.entity.js';

describe('SalaryStructuresService', () => {
  let service: SalaryStructuresService;
  let mockSalaryRepo: any;
  let mockEmployeeRepo: any;
  let mockAuditRepo: any;
  let mockDataSource: any;
  let mockQueryRunner: any;

  const mockEmployee = {
    id: 'emp-uuid-1',
    firstName: 'Priya',
    lastName: 'Nair',
    workCity: 'Bengaluru',
  };

  const mockActiveStructure = {
    id: 'sal-1',
    employeeId: 'emp-uuid-1',
    annualCtc: 1200000,
    monthlyCtc: 100000,
    effectiveFrom: '2023-01-01',
    effectiveTo: null,
  };

  beforeEach(() => {
    mockSalaryRepo = {
      findOne: vi.fn(),
      save: vi.fn(),
    };

    mockEmployeeRepo = {
      findOne: vi.fn(),
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
        create: vi.fn().mockImplementation((entityClass, data) => ({ ...data, id: 'new-sal-id' })),
        save: vi.fn().mockImplementation((data) => Promise.resolve(data)),
      },
    };

    mockDataSource = {
      createQueryRunner: vi.fn().mockReturnValue(mockQueryRunner),
    };

    service = new SalaryStructuresService(
      mockSalaryRepo,
      mockEmployeeRepo,
      mockAuditRepo,
      mockDataSource,
    );
  });

  describe('createRevision', () => {
    it('should close existing structure and create a new SCD2 structure', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue(mockEmployee);
      mockSalaryRepo.findOne.mockResolvedValue(mockActiveStructure);

      const dto = {
        employeeId: 'emp-uuid-1',
        annualCtc: 1500000,
        effectiveFrom: '2024-04-01',
        revisionReason: RevisionReason.APPRAISAL,
        remarks: 'Annual merit appraisal',
      };

      const result = await service.createRevision(dto, 'admin-uuid');

      expect(result).toBeDefined();
      expect(mockActiveStructure.effectiveTo).toBe('2024-03-31'); // closed on previous day
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(mockActiveStructure);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw NotFoundException if employee is not found', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue(null);

      const dto = {
        employeeId: 'invalid-emp',
        annualCtc: 1500000,
        effectiveFrom: '2024-04-01',
        revisionReason: RevisionReason.APPRAISAL,
      };

      await expect(service.createRevision(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if new effectiveFrom <= current effectiveFrom', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue(mockEmployee);
      mockSalaryRepo.findOne.mockResolvedValue(mockActiveStructure);

      const dto = {
        employeeId: 'emp-uuid-1',
        annualCtc: 1500000,
        effectiveFrom: '2022-12-01', // Before 2023-01-01
        revisionReason: RevisionReason.PROMOTION,
      };

      await expect(service.createRevision(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return structure by id', async () => {
      mockSalaryRepo.findOne.mockResolvedValue(mockActiveStructure);

      const result = await service.findOne('sal-1');

      expect(result).toEqual(mockActiveStructure);
    });

    it('should throw NotFoundException if not found', async () => {
      mockSalaryRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-sal')).rejects.toThrow(NotFoundException);
    });
  });
});
