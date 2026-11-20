import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { EmploymentStatus } from '../../entities/employee.entity.js';

export class EmployeeQueryDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  grade?: string;

  @IsEnum(EmploymentStatus)
  @IsOptional()
  status?: EmploymentStatus;

  @IsString()
  @IsOptional()
  workCity?: string;

  @IsString()
  @IsOptional()
  workState?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  ctcMin?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  ctcMax?: number;

  @IsString()
  @IsOptional()
  sortBy?: string = 'firstName';

  @IsString()
  @IsOptional()
  order?: 'ASC' | 'DESC' = 'ASC';
}
