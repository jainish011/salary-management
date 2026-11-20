import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  EmploymentStatus,
  EmploymentType,
  TaxRegime,
} from '../../entities/employee.entity.js';

export class UpdateEmployeeDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  panNumber?: string;

  @IsString()
  @IsOptional()
  uanNumber?: string;

  @IsString()
  @IsOptional()
  dateOfJoining?: string;

  @IsString()
  @IsOptional()
  dateOfLeaving?: string;

  @IsEnum(EmploymentStatus)
  @IsOptional()
  employmentStatus?: EmploymentStatus;

  @IsEnum(EmploymentType)
  @IsOptional()
  employmentType?: EmploymentType;

  @IsString()
  @IsOptional()
  designation?: string;

  @IsString()
  @IsOptional()
  grade?: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  workCity?: string;

  @IsString()
  @IsOptional()
  workState?: string;

  @IsEnum(TaxRegime)
  @IsOptional()
  taxRegime?: TaxRegime;
}
