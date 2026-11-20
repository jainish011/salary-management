import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDepartmentDto {
  @IsString({ message: 'Department name must be a string' })
  @IsOptional()
  @MaxLength(100, { message: 'Department name cannot exceed 100 characters' })
  name?: string;

  @IsString({ message: 'Description must be a string' })
  @IsOptional()
  description?: string;
}
