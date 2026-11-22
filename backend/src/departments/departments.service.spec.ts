import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { DepartmentsService } from './departments.service.js';

describe('DepartmentsService', () => {
  let service: DepartmentsService;
  let mockDeptRepository: any;

  const mockDept = {
    id: 'dept-uuid-1',
    name: 'Engineering',
    description: 'Core software engineering',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockDeptRepository = {
      findOne: vi.fn(),
      find: vi.fn(),
      create: vi.fn(),
      save: vi.fn(),
      createQueryBuilder: vi.fn(),
    };

    service = new DepartmentsService(mockDeptRepository);
  });

  describe('findAll', () => {
    it('should return departments with headcount and avgMonthlyCtc', async () => {
      const mockRaw = [
        {
          id: 'dept-uuid-1',
          name: 'Engineering',
          description: 'Core software engineering',
          createdAt: new Date(),
          updatedAt: new Date(),
          headcount: '150',
          avgMonthlyCtc: '125000',
          totalMonthlyCtc: '18750000',
        },
      ];

      const mockQueryBuilder = {
        leftJoin: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        addGroupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getRawMany: vi.fn().mockResolvedValue(mockRaw),
      };

      const mockDeptRepository = {
        findOne: vi.fn(),
        find: vi.fn(),
        create: vi.fn(),
        save: vi.fn(),
        createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
      };

      service = new DepartmentsService(mockDeptRepository as any);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Engineering');
      expect(result[0].headcount).toBe(150);
      expect(result[0].avgMonthlyCtc).toBe(125000);
      expect(result[0].totalMonthlyCtc).toBe(18750000);
    });
  });

  describe('findOne', () => {
    it('should return a department by id', async () => {
      mockDeptRepository.findOne.mockResolvedValue(mockDept);

      const result = await service.findOne('dept-uuid-1');

      expect(result).toEqual(mockDept);
      expect(mockDeptRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'dept-uuid-1' },
      });
    });

    it('should throw NotFoundException if department does not exist', async () => {
      mockDeptRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a department successfully', async () => {
      mockDeptRepository.findOne.mockResolvedValue(null);
      mockDeptRepository.create.mockReturnValue(mockDept);
      mockDeptRepository.save.mockResolvedValue(mockDept);

      const result = await service.create({
        name: 'Engineering',
        description: 'Core software engineering',
      });

      expect(result).toEqual(mockDept);
      expect(mockDeptRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if department name already exists', async () => {
      mockDeptRepository.findOne.mockResolvedValue(mockDept);

      await expect(
        service.create({
          name: 'Engineering',
          description: 'Duplicate',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update department successfully', async () => {
      mockDeptRepository.findOne
        .mockResolvedValueOnce(mockDept) // for findOne
        .mockResolvedValueOnce(null); // for conflict check
      mockDeptRepository.save.mockResolvedValue({
        ...mockDept,
        name: 'Product Engineering',
      });

      const result = await service.update('dept-uuid-1', {
        name: 'Product Engineering',
      });

      expect(result.name).toBe('Product Engineering');
    });

    it('should throw ConflictException if updated name belongs to another department', async () => {
      mockDeptRepository.findOne
        .mockResolvedValueOnce(mockDept) // findOne
        .mockResolvedValueOnce({ id: 'dept-uuid-2', name: 'Design' }); // conflict check

      await expect(
        service.update('dept-uuid-1', {
          name: 'Design',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
