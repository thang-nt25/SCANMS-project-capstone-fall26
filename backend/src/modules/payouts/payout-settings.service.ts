import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface VietQrBank {
  bin: string;
  code: string;
  name: string;
  aliases: string[];
}

@Injectable()
export class PayoutSettingsService {
  readonly maxBillBytes: number;
  readonly billFolder: string;
  readonly qrBaseUrl: string;
  readonly qrTemplate: string;
  private readonly banks = new Map<string, VietQrBank>();

  constructor(config: ConfigService) {
    const limit = config.get<string>('PAYOUT_MAX_BILL_BYTES') ?? '5242880';
    if (
      !/^\d+$/.test(String(limit)) ||
      Number(limit) < 1024 ||
      Number(limit) > 20971520
    ) {
      throw new Error(
        'PAYOUT_MAX_BILL_BYTES must be between 1024 and 20971520',
      );
    }
    this.maxBillBytes = Number(limit);
    this.billFolder =
      config.get<string>('PAYOUT_BILL_FOLDER') ?? 'scanms/payouts/bills';
    this.qrBaseUrl =
      config.get<string>('PAYOUT_VIETQR_BASE_URL') ??
      'https://img.vietqr.io/image/';
    const base = new URL(this.qrBaseUrl);
    if (
      base.protocol !== 'https:' ||
      base.username ||
      base.password ||
      base.search ||
      base.hash
    )
      throw new Error(
        'PAYOUT_VIETQR_BASE_URL must be a credential-free HTTPS URL',
      );
    this.qrTemplate =
      config.get<string>('PAYOUT_VIETQR_TEMPLATE') ?? 'compact2';
    if (!/^[a-zA-Z0-9]+$/.test(this.qrTemplate))
      throw new Error('Invalid PAYOUT_VIETQR_TEMPLATE');
    let parsed: unknown;
    try {
      parsed = JSON.parse(config.get<string>('PAYOUT_VIETQR_BANKS') ?? '[]');
    } catch {
      throw new Error('PAYOUT_VIETQR_BANKS must be a JSON array');
    }
    if (!Array.isArray(parsed))
      throw new Error('PAYOUT_VIETQR_BANKS must be a JSON array');
    for (const value of parsed as unknown[]) {
      if (!value || typeof value !== 'object')
        throw new Error('Invalid VietQR bank config');
      const bank = value as Record<string, unknown>;
      if (
        typeof bank.bin !== 'string' ||
        !/^\d{6}$/.test(bank.bin) ||
        typeof bank.code !== 'string' ||
        !/^[A-Za-z0-9]+$/.test(bank.code) ||
        typeof bank.name !== 'string' ||
        !bank.name.trim() ||
        (bank.aliases !== undefined &&
          (!Array.isArray(bank.aliases) ||
            !bank.aliases.every(
              (alias: unknown) => typeof alias === 'string' && alias.trim(),
            )))
      )
        throw new Error('Invalid VietQR bank config');
      const entry: VietQrBank = {
        bin: bank.bin,
        code: bank.code,
        name: bank.name,
        aliases: (bank.aliases ?? []) as string[],
      };
      for (const alias of [
        entry.bin,
        entry.code,
        entry.name,
        ...entry.aliases,
      ]) {
        const key = this.normalizeBank(alias);
        const existing = this.banks.get(key);
        if (existing && existing.bin !== entry.bin)
          throw new Error('Ambiguous VietQR bank alias');
        this.banks.set(key, entry);
      }
    }
  }

  resolveBank(name: string) {
    const bank = this.banks.get(this.normalizeBank(name));
    if (!bank)
      throw new BadRequestException(
        'Ngân hàng chưa được cấu hình mã VietQR; hãy cập nhật PAYOUT_VIETQR_BANKS',
      );
    return bank;
  }

  private normalizeBank(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/gi, 'd')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase();
  }
}
