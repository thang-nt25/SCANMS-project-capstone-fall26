import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PayoutRequest, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { BidvSandboxClient } from './bidv-sandbox.client';
import { BIDV_TRANSFER_FIXTURE } from './bidv-sandbox.service';
import { bidvRequestDate, newBidvCorrelation, type BidvResponse } from './bidv-sandbox.protocol';
import { payoutBankCode } from './payout-bank-code';

export interface BidvPayoutSnapshot {
  request: Record<string, string>;
  correlation: { idempotencyKey: string; interactionId: string };
}

@Injectable()
export class BidvPayoutAdapter {
  constructor(private readonly prisma: PrismaService, private readonly client: BidvSandboxClient) {}

  availability() { return this.client.availability(); }

  prepare(payout: PayoutRequest): BidvPayoutSnapshot {
    if (!payout.bankAccountNumber?.trim() || !payout.bankAccountName?.trim() || !payout.bankName?.trim())
      throw new BadRequestException('Yêu cầu rút thiếu thông tin người thụ hưởng đã lưu.');
    if (!payout.netAmount.isInteger() || payout.netAmount.lte(0) || !payout.netAmount.plus(payout.taxAmount).equals(payout.amount))
      throw new BadRequestException('Số tiền thực chi phải là VND nguyên đồng, lớn hơn 0 và khớp tiền yêu cầu trừ thuế.');
    return {
      // Only sandbox merchant/protocol fields come from the provider fixture.
      // Beneficiary and NET must always come from this persisted payout.
      request: {
        serviceId: BIDV_TRANSFER_FIXTURE.serviceId,
        merchantId: BIDV_TRANSFER_FIXTURE.merchantId,
        merchantName: BIDV_TRANSFER_FIXTURE.merchantName,
        payerId: BIDV_TRANSFER_FIXTURE.payerId,
        channelId: BIDV_TRANSFER_FIXTURE.channelId,
        creditType: BIDV_TRANSFER_FIXTURE.creditType,
        extraInfo1: '', extraInfo2: '', extraInfo3: '', extraInfo4: '', extraInfo5: '',
        credit: payout.bankAccountNumber, beneficiaryName: payout.bankAccountName,
        bankCode: payoutBankCode(payout.bankName), amount: payout.netAmount.toFixed(0),
        transDesc: `SCANMS ${payout.id}`, transDate: bidvRequestDate() },
      correlation: { ...newBidvCorrelation(), idempotencyKey: payout.id },
    };
  }

  async execute(payout: PayoutRequest, actorId: string, reconcile: boolean, snapshot?: BidvPayoutSnapshot) {
    if (!this.availability().configured) throw new ServiceUnavailableException('BIDV Sandbox chưa sẵn sàng.');
    if (!snapshot) {
      const start = await this.prisma.auditLog.findFirst({ where: { action: 'START_BANK_PAYOUT', details: { path: ['payoutId'], equals: payout.id } }, orderBy: { createdAt: 'desc' } });
      snapshot = (start?.details as unknown as { sandbox?: BidvPayoutSnapshot })?.sandbox;
    }
    if (!snapshot || snapshot.correlation.idempotencyKey !== payout.id ||
        !new Prisma.Decimal(snapshot.request.amount).equals(payout.netAmount) ||
        snapshot.request.credit !== payout.bankAccountNumber || snapshot.request.beneficiaryName !== payout.bankAccountName ||
        snapshot.request.bankCode !== payoutBankCode(payout.bankName!)) {
      throw new ServiceUnavailableException('Không khớp thông tin lệnh Sandbox đã lưu. Cần đối soát.');
    }

    // Recover a durably saved response after a lost final database commit without
    // sending another transfer. Sandbox acceptance is NOT production settlement.
    if (reconcile) {
      const saved = await this.prisma.auditLog.findFirst({ where: { action: 'BIDV_PAYOUT_RESPONSE', details: { path: ['payoutId'], equals: payout.id } }, orderBy: { createdAt: 'desc' } });
      const previous = saved?.details as unknown as { accepted?: boolean; amount?: string; provider?: string; environment?: string } | undefined;
      if (previous?.accepted === true && previous.provider === 'BIDV_SANDBOX' && previous.environment === 'SANDBOX' &&
          previous.amount === payout.netAmount.toFixed(2)) return this.result(payout, true);
    }

    let response: BidvResponse;
    if (reconcile) {
      const request = snapshot.request;
      response = await this.client.call('inquiry', {
        serviceId: request.serviceId, merchantId: request.merchantId, merchantName: request.merchantName,
        channelId: request.channelId, rootRequestId: snapshot.correlation.idempotencyKey,
        rootRequestDate: request.transDate, type: '19980710', terminalId: '19980710',
        extraInfo1: '', extraInfo2: '', extraInfo3: '', extraInfo4: '', extraInfo5: '',
      }, newBidvCorrelation());
    } else response = await this.client.call('transfer', snapshot.request, snapshot.correlation);

    const transaction = response.transactions[0];
    const matched = response.listValid && response.transactions.length === 1 &&
      transaction.rootRequestId === payout.id && new Prisma.Decimal(transaction.amount).equals(payout.netAmount);
    // Explicit SCANMS test rule for the user's BIDV Try It contract. A direct
    // transfer response 000 completes the INTERNAL sandbox payout. Inquiry must
    // additionally match the saved request and amount; canned unrelated rows do not.
    const accepted = response.httpStatus >= 200 && response.httpStatus < 300 && response.errorCode === '000' &&
      (!reconcile || (matched && transaction.detailCode === '000'));
    await this.prisma.auditLog.create({ data: { userId: actorId, action: 'BIDV_PAYOUT_RESPONSE', details: {
      payoutId: payout.id, provider: 'BIDV_SANDBOX', environment: 'SANDBOX', operation: reconcile ? 'inquiry' : 'transfer',
      amount: payout.netAmount.toFixed(2), accepted, settlementConfirmed: false, response: { ...response },
    } } });
    return this.result(payout, accepted);
  }

  private result(payout: PayoutRequest, accepted: boolean) {
    return { payoutId: payout.id, amount: payout.netAmount.toFixed(2), currency: 'VND',
      status: accepted ? 'SUCCEEDED' : 'PROCESSING',
      // This is a local test reference, never a fabricated BIDV bank reference.
      bankRefCode: accepted ? `SBX-${payout.id}` : undefined };
  }
}
