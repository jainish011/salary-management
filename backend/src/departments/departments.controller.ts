import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  DepartmentsService,
  DepartmentWithStats,
} from './departments.service.js';
import { CreateDepartmentDto } from './dto/create-department.dto.js';
import { UpdateDepartmentDto } from './dto/update-department.dto.js';
import { Department } from '../entities/department.entity.js';

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  async findAll(): Promise<DepartmentWithStats[]> {
    return this.departmentsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Department> {
    return this.departmentsService.findOne(id);
  }

  @Post()
  async create(@Body() createDto: CreateDepartmentDto): Promise<Department> {
    return this.departmentsService.create(createDto);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateDepartmentDto,
  ): Promise<Department> {
    return this.departmentsService.update(id, updateDto);
  }
}
