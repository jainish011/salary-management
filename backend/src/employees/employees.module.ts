import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../entities/employee.entity.js';
import { SalaryStructure } from '../entities/salary-structure.entity.js';
import { Payslip } from '../entities/payslip.entity.js';
import { AuditLog } from '../entities/audit-log.entity.js';
import { EmployeesService } from './employees.service.js';
import { EmployeesController } from './employees.controller.js';
import { SalaryStructuresService } from './salary-structures.service.js';
import { SalaryStructuresController } from './salary-structures.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, SalaryStructure, Payslip, AuditLog]),
  ],
  controllers: [EmployeesController, SalaryStructuresController],
  providers: [EmployeesService, SalaryStructuresService],
  exports: [EmployeesService, SalaryStructuresService],
})
export class EmployeesModule {}
