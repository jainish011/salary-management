import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { RevisionReason } from '../../entities/salary-structure.entity.js';

export class CreateSalaryRevisionDto {
  @IsUUID('4', { message: 'Valid employee ID is required' })
  @IsNotEmpty()
  employeeId: string;

  @IsNumber()
  @Min(100000, { message: 'Annual CTC must be at least ₹1,00,000' })
  annualCtc: number;

  @IsString({ message: 'Effective from date is required' })
  @IsNotEmpty()
  effectiveFrom: string;

  @IsEnum(RevisionReason)
  @IsOptional()
  revisionReason?: RevisionReason = RevisionReason.APPRAISAL;

  @IsString()
  @IsOptional()
  remarks?: string;
}
