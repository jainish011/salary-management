import { Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service.js';
import { AuditQueryDto } from './dto/audit-query.dto.js';

@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async findAll(@Query() query: AuditQueryDto) {
    return this.auditService.findAll(query);
  }
}
