import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { PayrollService } from './payroll.service.js';
import { CreatePayrollPeriodDto } from './dto/create-payroll-period.dto.js';
import { PeriodPayslipsQueryDto } from './dto/period-payslips-query.dto.js';
import { PaginationQueryDto } from '../common/pagination.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller('payroll-periods')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get()
  async findAll(@Query() query: PaginationQueryDto) {
    return this.payrollService.findAll(query.page, query.limit);
  }

  @Post()
  async create(
    @Body() dto: CreatePayrollPeriodDto,
    @CurrentUser() user?: { id: string },
  ) {
    return this.payrollService.create(dto, user?.id);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.payrollService.findOne(id);
  }

  @Get(':id/payslips')
  async getPayslips(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PeriodPayslipsQueryDto,
  ) {
    return this.payrollService.getPeriodPayslips(id, query);
  }

  @Post(':id/run')
  async runPayroll(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: { id: string },
  ) {
    return this.payrollService.runPayroll(id, user?.id);
  }

  @Post(':id/lock')
  async lockPayroll(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: { id: string },
  ) {
    return this.payrollService.lockPayroll(id, user?.id);
  }
}
