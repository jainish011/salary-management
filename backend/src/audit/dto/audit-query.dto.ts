import { IsOptional, IsString, IsUUID, IsDateString } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination.dto.js';

export class AuditQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsUUID()
  changedBy?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
