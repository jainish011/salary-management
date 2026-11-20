import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { SalaryStructuresService } from './salary-structures.service.js';
import { CreateSalaryRevisionDto } from './dto/create-salary-revision.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller('salary-structures')
export class SalaryStructuresController {
  constructor(
    private readonly salaryStructuresService: SalaryStructuresService,
  ) {}

  @Post()
  async createRevision(
    @Body() dto: CreateSalaryRevisionDto,
    @CurrentUser() user?: { id: string },
  ) {
    return this.salaryStructuresService.createRevision(dto, user?.id);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.salaryStructuresService.findOne(id);
  }
}
