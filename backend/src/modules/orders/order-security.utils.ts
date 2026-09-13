import {
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

function equalSecret(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyWebhookSecret(
  config: ConfigService,
  storeId: string,
  source: string,
  supplied?: string,
): void {
  let mapping: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(
      config.get<string>('ORDER_WEBHOOK_SECRETS') ?? '{}',
    );
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      throw new Error('invalid config');
    mapping = parsed as Record<string, unknown>;
  } catch {
    throw new ServiceUnavailableException('Cấu hình webhook chưa hợp lệ');
  }
  const secret = mapping[`${storeId}:${source}`];
  if (typeof secret !== 'string' || secret.length < 32)
    throw new ServiceUnavailableException(
      'Shop chưa cấu hình webhook cho nguồn này',
    );
  if (!supplied || !equalSecret(secret, supplied))
    throw new UnauthorizedException('Webhook không được xác thực');
}

export function createReviewToken(
  config: ConfigService,
  orderId: string,
): string {
  const secret = config.get<string>('JWT_SECRET');
  const ttlSeconds = Number(
    config.get<string>('ORDER_REVIEW_TOKEN_TTL_SECONDS') ?? 900,
  );
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 60 || ttlSeconds > 3600)
    throw new ServiceUnavailableException(
      'Cấu hình thời gian xác minh đánh giá không hợp lệ',
    );
  if (!secret)
    throw new ServiceUnavailableException('Chưa cấu hình xác minh đánh giá');
  const payload = Buffer.from(
    JSON.stringify({
      orderId,
      expiresAt: Date.now() + ttlSeconds * 1000,
      purpose: 'order-review',
    }),
  ).toString('base64url');
  return `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`;
}

export function verifyReviewToken(
  config: ConfigService,
  orderId: string,
  token: string,
): void {
  const secret = config.get<string>('JWT_SECRET');
  const [payload, signature, extra] = token.split('.');
  if (
    !secret ||
    !payload ||
    !signature ||
    extra ||
    !equalSecret(
      signature,
      createHmac('sha256', secret).update(payload).digest('base64url'),
    )
  )
    throw new ForbiddenException('Cần xác minh đơn hàng trước khi đánh giá');
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
      orderId?: string;
      expiresAt?: number;
      purpose?: string;
    };
    if (
      data.orderId !== orderId ||
      data.purpose !== 'order-review' ||
      typeof data.expiresAt !== 'number' ||
      data.expiresAt <= Date.now()
    )
      throw new Error('invalid token');
  } catch {
    throw new ForbiddenException(
      'Xác minh đơn hàng đã hết hạn hoặc không hợp lệ',
    );
  }
}
