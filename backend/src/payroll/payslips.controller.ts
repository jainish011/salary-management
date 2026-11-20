import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { PayrollService } from './payroll.service.js';

@Controller('payslips')
export class PayslipsController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.payrollService.getPayslipById(id);
  }
}
