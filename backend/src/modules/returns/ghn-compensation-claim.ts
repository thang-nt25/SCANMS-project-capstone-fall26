import { ConflictException } from '@nestjs/common';
import type { GhnClaimActionInput } from './return.schemas';

export type GhnClaimStatus = 'DRAFT' | 'SUBMITTED' | 'NEEDS_MORE_EVIDENCE' | 'ACCEPTED' | 'REJECTED' | 'PAID';
export interface GhnClaimSnapshot {
  status: GhnClaimStatus;
  originalTrackingNumber: string;
  replacementTrackingNumber?: string;
  evidenceUrls: string[];
  ghnReference?: string;
  claimedAmount?: number;
  approvedAmount?: number;
  notes?: string;
  proofUrl?: string;
  updatedAt: string;
}

export function latestGhnClaim(events: Array<{ type: string; data: unknown; createdAt: Date }>): GhnClaimSnapshot | null {
  const event = [...events].reverse().find((item) =>
    item.type === 'GHN_COMPENSATION_CLAIM_UPDATED' || item.type === 'GHN_COMPENSATION_CLAIM_OPENED');
  if (!event || !event.data || typeof event.data !== 'object' || Array.isArray(event.data)) return null;
  const data = event.data as Record<string, unknown>;
  if (typeof data.originalTrackingNumber !== 'string' || !data.originalTrackingNumber.trim()) return null;
  return {
    status: (['DRAFT', 'SUBMITTED', 'NEEDS_MORE_EVIDENCE', 'ACCEPTED', 'REJECTED', 'PAID'].includes(String(data.status))
      ? data.status : 'DRAFT') as GhnClaimStatus,
    originalTrackingNumber: data.originalTrackingNumber,
    replacementTrackingNumber: typeof data.replacementTrackingNumber === 'string' ? data.replacementTrackingNumber : undefined,
    evidenceUrls: Array.isArray(data.evidenceUrls) ? data.evidenceUrls.filter((value): value is string => typeof value === 'string') : [],
    ghnReference: typeof data.ghnReference === 'string' ? data.ghnReference : undefined,
    claimedAmount: typeof data.claimedAmount === 'number' ? data.claimedAmount : undefined,
    approvedAmount: typeof data.approvedAmount === 'number' ? data.approvedAmount : undefined,
    notes: typeof data.notes === 'string' ? data.notes : undefined,
    proofUrl: typeof data.proofUrl === 'string' ? data.proofUrl : undefined,
    updatedAt: event.createdAt.toISOString(),
  };
}

export function advanceGhnClaim(current: GhnClaimSnapshot, input: GhnClaimActionInput): GhnClaimSnapshot {
  const allowed: Record<GhnClaimStatus, GhnClaimActionInput['action'][]> = {
    DRAFT: ['SUBMIT'],
    SUBMITTED: ['REQUEST_MORE', 'ACCEPT', 'REJECT'],
    NEEDS_MORE_EVIDENCE: ['SUBMIT'],
    ACCEPTED: ['PAID'],
    REJECTED: ['APPEAL'],
    PAID: [],
  };
  if (!allowed[current.status].includes(input.action))
    throw new ConflictException('Trạng thái yêu cầu bồi hoàn GHN không cho phép thao tác này');
  const status: GhnClaimStatus = {
    SUBMIT: 'SUBMITTED', REQUEST_MORE: 'NEEDS_MORE_EVIDENCE',
    ACCEPT: 'ACCEPTED', REJECT: 'REJECTED', APPEAL: 'SUBMITTED', PAID: 'PAID',
  }[input.action] as GhnClaimStatus;
  const ghnReference = input.ghnReference?.trim() || current.ghnReference;
  const claimedAmount = input.claimedAmount ?? current.claimedAmount;
  const approvedAmount = input.approvedAmount ?? current.approvedAmount;
  if (input.action === 'SUBMIT' && (!ghnReference || !claimedAmount))
    throw new ConflictException('Cần mã yêu cầu GHN và số tiền yêu cầu bồi hoàn');
  if (input.action === 'SUBMIT' && current.evidenceUrls.length === 0 && !input.proofUrl)
    throw new ConflictException('Cần ít nhất một tệp bằng chứng trước khi gửi GHN');
  if (input.action === 'SUBMIT' && current.status === 'NEEDS_MORE_EVIDENCE' && !input.proofUrl)
    throw new ConflictException('Cần bổ sung chứng từ GHN yêu cầu trước khi gửi lại');
  if (input.action === 'APPEAL' && (!input.proofUrl || !input.ghnReference || input.ghnReference.trim() === current.ghnReference))
    throw new ConflictException('Kháng nghị cần chứng cứ mới và mã yêu cầu GHN mới');
  if (['ACCEPT', 'PAID'].includes(input.action) && (!approvedAmount || approvedAmount > (claimedAmount || 0)))
    throw new ConflictException('Số tiền GHN chấp thuận phải hợp lệ và không vượt số tiền yêu cầu');
  if (['REQUEST_MORE', 'ACCEPT', 'REJECT', 'PAID'].includes(input.action) && !input.proofUrl)
    throw new ConflictException('Cần tệp xác nhận hoặc phản hồi của GHN');
  return {
    ...current, status, ghnReference, claimedAmount, approvedAmount,
    notes: input.notes.trim(), proofUrl: input.proofUrl || current.proofUrl,
    evidenceUrls: input.proofUrl && !current.evidenceUrls.includes(input.proofUrl)
      ? [...current.evidenceUrls, input.proofUrl] : current.evidenceUrls,
    updatedAt: new Date().toISOString(),
  };
}
