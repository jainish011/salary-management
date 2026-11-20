import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditService } from './audit.service.js';

describe('AuditService', () => {
  let service: AuditService;
  let mockAuditRepo: any;

  beforeEach(() => {
    mockAuditRepo = {
      createQueryBuilder: vi.fn(),
    };

    service = new AuditService(mockAuditRepo);
  });

  describe('findAll', () => {
    it('should query audit logs with pagination and filters', async () => {
      const mockAuditLogs = [
        {
          id: '1',
          entityType: 'PAYROLL_PERIOD',
          entityId: 'p-1',
          action: 'CREATE',
          createdAt: new Date(),
        },
      ];

      const mockQb = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([mockAuditLogs, 1]),
      };

      mockAuditRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        entityType: 'PAYROLL_PERIOD',
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'audit.entityType = :entityType',
        { entityType: 'PAYROLL_PERIOD' },
      );
    });
  });
});
