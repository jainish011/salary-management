import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  EmploymentStatus,
  EmploymentType,
  TaxRegime,
} from '../../entities/employee.entity.js';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  lastName: string;

  @IsEmail({}, { message: 'Valid email is required' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @IsOptional()
  emailDomain?: string;

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
  @IsNotEmpty({ message: 'Date of joining is required' })
  dateOfJoining: string;

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

  @IsNumber()
  @Min(100000, { message: 'Annual CTC must be at least ₹1,00,000' })
  annualCtc: number;
}
