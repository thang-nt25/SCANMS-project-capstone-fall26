import { IsOptional, IsString, IsNumber, IsEnum, Min, Max } from 'class-validator';
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
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  category?: AuditCategory;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  severity?: AuditSeverity;
}

export class ExportAuditLogsDto {
  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  category?: AuditCategory;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
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
