import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../entities/employee.entity.js';
import { Department } from '../entities/department.entity.js';
import { SalaryStructure } from '../entities/salary-structure.entity.js';
import { PayrollPeriod } from '../entities/payroll-period.entity.js';
import { AuditLog } from '../entities/audit-log.entity.js';
import { CacheService } from '../common/cache.service.js';
import { ReportsService } from './reports.service.js';
import { ReportsController } from './reports.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Employee,
      Department,
      SalaryStructure,
      PayrollPeriod,
      AuditLog,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
