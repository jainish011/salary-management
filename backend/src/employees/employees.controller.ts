import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { EmployeesService } from './employees.service.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';
import { EmployeeQueryDto } from './dto/employee-query.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { PaginationQueryDto } from '../common/pagination.dto.js';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  async findAll(@Query() query: EmployeeQueryDto) {
    return this.employeesService.findAll(query);
  }

  @Post()
  async create(
    @Body() dto: CreateEmployeeDto,
    @CurrentUser() user?: { id: string },
  ) {
    return this.employeesService.create(dto, user?.id);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.employeesService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user?: { id: string },
  ) {
    return this.employeesService.update(id, dto, user?.id);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: { id: string },
  ) {
    return this.employeesService.softDelete(id, user?.id);
  }

  @Get(':id/salary-history')
  async getSalaryHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.employeesService.getSalaryHistory(id);
  }

  @Get(':id/payslips')
  async getPayslips(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.employeesService.getPayslips(id, query.page, query.limit);
  }
}
