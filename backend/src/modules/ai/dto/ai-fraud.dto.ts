import { IsOptional, IsString, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export type FraudRiskLevel = 'CLEAN' | 'LOW_RISK' | 'SUSPICIOUS' | 'FRAUD_CRITICAL';

export type FraudAnomalyType =
  | 'CLICK_BURST_BOT'
  | 'ZOMBIE_TRAFFIC'
  | 'FLASH_CONVERSION'
  | 'SELF_REFERRAL'
  | 'CONVERSION_SPIKE'
  | 'IP_CLUSTER';

export type FraudIncidentStatus = 'ACTIVE' | 'FROZEN' | 'RESOLVED' | 'DISMISSED';

export type FraudMitigationAction = 'FREEZE_COMMISSION' | 'PAUSE_LINK' | 'DISMISS' | 'RESOLVE';

export class FraudScanQueryDto {
  @IsOptional()
  @IsString()
  storeId?: string;

  @IsOptional()
  @IsString()
  collaboratorId?: string;

  @IsOptional()
  @IsString()
  timeframe?: '24h' | '7d' | '30d' | 'all' = '30d';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  minRiskScore?: number;

  @IsOptional()
  @IsString()
  status?: FraudIncidentStatus;
}

export class FraudActionDto {
  @IsEnum(['FREEZE_COMMISSION', 'PAUSE_LINK', 'DISMISS', 'RESOLVE'], {
    message: 'Hành động không hợp lệ',
  })
  action: FraudMitigationAction;

  @IsOptional()
  @IsString()
  note?: string;
}

export interface FraudEvidenceItem {
  metric: string;
  value: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
}

export interface FraudIncidentDto {
  id: string;
  incidentCode: string;
  collaboratorId: string;
  collaboratorName: string;
  collaboratorEmail: string;
  collaboratorAvatar?: string;
  collaboratorTier?: string;
  storeId?: string;
  storeName?: string;
  referralLinkId?: string;
  referralLinkCode?: string;
  productName?: string;
  riskScore: number; // 0 - 100
  riskLevel: FraudRiskLevel;
  anomalyTypes: FraudAnomalyType[];
  totalClicks: number;
  totalOrders: number;
  conversionRate: number; // %
  pendingCommissionAmount: number; // VND
  aiReasoning: string;
  evidences: FraudEvidenceItem[];
  suggestedAction: 'FREEZE_COMMISSION' | 'PAUSE_LINK' | 'MONITOR' | 'NONE';
  status: FraudIncidentStatus;
  detectedAt: Date;
  actionHistory?: Array<{
    action: string;
    performedBy: string;
    performedAt: Date;
    note?: string;
  }>;
}

export interface FraudScanSummaryDto {
  totalScannedLinks: number;
  totalScannedClicks: number;
  totalIncidents: number;
  criticalCount: number;
  suspiciousCount: number;
  lowRiskCount: number;
  cleanCount: number;
  potentialSavedAmount: number;
  scanTimestamp: Date;
  incidents: FraudIncidentDto[];
}
