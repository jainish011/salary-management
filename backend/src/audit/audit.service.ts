import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity.js';
import { AuditQueryDto } from './dto/audit-query.dto.js';
import { PaginatedResponse } from '../common/pagination.dto.js';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  async findAll(query: AuditQueryDto): Promise<PaginatedResponse<AuditLog>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const qb = this.auditRepository
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.changer', 'changer');

    if (query.entityType) {
      qb.andWhere('audit.entityType = :entityType', {
        entityType: query.entityType.toUpperCase(),
      });
    }

    if (query.entityId) {
      qb.andWhere('audit.entityId = :entityId', { entityId: query.entityId });
    }

    if (query.changedBy) {
      qb.andWhere('audit.changedBy = :changedBy', { changedBy: query.changedBy });
    }

    if (query.from) {
      qb.andWhere('audit.createdAt >= :from', { from: query.from });
    }

    if (query.to) {
      qb.andWhere('audit.createdAt <= :to', { to: `${query.to} 23:59:59` });
    }

    qb.orderBy('audit.createdAt', 'DESC');
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
}
