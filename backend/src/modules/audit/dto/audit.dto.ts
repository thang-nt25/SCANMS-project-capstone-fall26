import {
  IsOptional,
  IsString,
  IsEnum,
  Min,
  Max,
  IsInt,
  IsDateString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export type AuditSeverity = 'INFO' | 'WARN' | 'CRITICAL';

export type AuditCategory =
  | 'AUTH'
  | 'FINANCIAL'
  | 'PRODUCT'
  | 'STORE'
  | 'SAMPLE_CAMPAIGN'
  | 'AI_SECURITY'
  | 'SYSTEM'
  | 'OTHER';

export class QueryAuditLogsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsEnum(['AUTH', 'FINANCIAL', 'PRODUCT', 'STORE', 'SAMPLE_CAMPAIGN', 'AI_SECURITY', 'SYSTEM', 'OTHER'])
  category?: AuditCategory;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  keyword?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(['INFO', 'WARN', 'CRITICAL'])
  severity?: AuditSeverity;
}

export class ExportAuditLogsDto {
  @IsOptional()
  @IsEnum(['INFO', 'WARN', 'CRITICAL'])
  severity?: AuditSeverity;

  @IsOptional()
  @IsString()
  role?: string;
  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsEnum(['AUTH', 'FINANCIAL', 'PRODUCT', 'STORE', 'SAMPLE_CAMPAIGN', 'AI_SECURITY', 'SYSTEM', 'OTHER'])
  category?: AuditCategory;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  keyword?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  format?: 'csv' | 'json' = 'csv';
}

export interface AuditActionDefinition {
  code: string;
  nameVi: string;
  category: AuditCategory;
  severity: AuditSeverity;
  description: string;
}

export interface AuditStatsResponse {
  totalEvents: number;
  eventsToday: number;
  financialEventsCount: number;
  securityEventsCount: number;
  authEventsCount: number;
  topActors: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    role: string;
    count: number;
  }>;
  categoryBreakdown: Array<{
    category: AuditCategory;
    categoryNameVi: string;
    count: number;
    percentage: number;
  }>;
  recentSeverityCounts: {
    info: number;
    warn: number;
    critical: number;
  };
}
