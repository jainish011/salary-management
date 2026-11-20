import { IsInt, Min, Max, IsDateString, IsOptional } from 'class-validator';

export class CreatePayrollPeriodDto {
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsDateString()
  payDate?: string;
}
