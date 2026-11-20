import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayrollPeriod } from '../entities/payroll-period.entity.js';
import { Payslip } from '../entities/payslip.entity.js';
import { PayslipItem } from '../entities/payslip-item.entity.js';
import { Employee } from '../entities/employee.entity.js';
import { SalaryStructure } from '../entities/salary-structure.entity.js';
import { AuditLog } from '../entities/audit-log.entity.js';
import { PayrollCalculationService } from './payroll-calculation.service.js';
import { PayrollService } from './payroll.service.js';
import { PayrollController } from './payroll.controller.js';
import { PayslipsController } from './payslips.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PayrollPeriod,
      Payslip,
      PayslipItem,
      Employee,
      SalaryStructure,
      AuditLog,
    ]),
  ],
  controllers: [PayrollController, PayslipsController],
  providers: [PayrollCalculationService, PayrollService],
  exports: [PayrollCalculationService, PayrollService],
})
export class PayrollModule {}
