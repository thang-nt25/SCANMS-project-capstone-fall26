import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { CreateOrderDto } from './dto/create-order.dto';

export const MAX_ORDER_AMOUNT = 9999999999999.99;
export const MAX_ORDER_ITEMS = 500;

export function normalizeCustomerPhone(value: string): string {
  let phone = value.trim().replace(/[()\s-]/g, '');
  if (phone.startsWith('+84')) phone = `0${phone.slice(3)}`;
  if (!/^0\d{9}$/.test(phone)) {
    throw new BadRequestException(
      'Số điện thoại phải gồm 10 chữ số hoặc định dạng +84',
    );
  }
  return phone;
}

export function validateOrderMoney(value: number, field: string): void {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > MAX_ORDER_AMOUNT ||
    new Prisma.Decimal(value).decimalPlaces() > 2
  ) {
    throw new BadRequestException(
      `${field} phải là số tiền không âm, tối đa 13 chữ số và 2 chữ số thập phân`,
    );
  }
}

export function validateCustomerName(value: string): string {
  if (!value || typeof value !== 'string') {
    throw new BadRequestException('Họ và tên người nhận là bắt buộc');
  }
  const trimmed = value.trim();
  if (trimmed.length < 2 || trimmed.length > 150) {
    throw new BadRequestException('Họ và tên người nhận phải từ 2 đến 150 ký tự');
  }
  // Disallow HTML tags, script injection
  if (/<[^>]*>/.test(trimmed) || /[<>{}\\]/.test(trimmed)) {
    throw new BadRequestException(
      'Họ và tên không được chứa ký tự đặc biệt hoặc mã độc script',
    );
  }
  return trimmed;
}

export function validateShippingAddress(value: string): string {
  if (!value || typeof value !== 'string') {
    throw new BadRequestException('Địa chỉ nhận hàng là bắt buộc');
  }
  const trimmed = value.trim();
  if (trimmed.length < 5 || trimmed.length > 500) {
    throw new BadRequestException('Địa chỉ nhận hàng phải từ 5 đến 500 ký tự');
  }
  if (/<[^>]*>/.test(trimmed)) {
    throw new BadRequestException('Địa chỉ không được chứa mã độc script');
  }
  return trimmed;
}

export function validateOrderNotes(value?: string): string | undefined {
  if (!value || typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 500) {
    throw new BadRequestException('Ghi chú giao hàng không được vượt quá 500 ký tự');
  }
  return trimmed.replace(/<[^>]*>/g, '');
}

/**
 * Tạo mã hash SHA-256 chuẩn hóa cho toàn bộ payload đặt hàng (Idempotency Canonical Hash)
 */
export function computeOrderPayloadHash(
  dto: CreateOrderDto,
  normalizedCustomerName: string,
  normalizedCustomerPhone: string,
  normalizedPaymentMethod: string,
): string {
  const canonicalItems = (dto.items || [])
    .map((it) => ({
      productId: (it.productId || '').trim().toLowerCase(),
      variantId: (it.variantId || '').trim().toLowerCase(),
      quantity: Number(it.quantity) || 1,
    }))
    .sort((a, b) => {
      const prodCmp = a.productId.localeCompare(b.productId);
      if (prodCmp !== 0) return prodCmp;
      return a.variantId.localeCompare(b.variantId);
    });

  const canonicalObject = {
    storeId: (dto.storeId || '').trim(),
    storeSlug: (dto.storeSlug || '').trim().toLowerCase(),
    customerName: normalizedCustomerName.trim().toLowerCase(),
    customerPhone: normalizedCustomerPhone.trim(),
    customerEmail: (dto.customerEmail || '').trim().toLowerCase(),
    shippingAddress: (dto.shippingAddress || '').trim().toLowerCase(),
    couponCode: (dto.couponCode || '').trim().toUpperCase(),
    cookieRefCode: (dto.cookieRefCode || '').trim().toLowerCase(),
    paymentMethod: normalizedPaymentMethod.trim().toUpperCase(),
    orderNotes: (dto.orderNotes || '').trim(),
    items: canonicalItems,
  };

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(canonicalObject))
    .digest('hex');
}

/**
 * Sinh mã đơn hàng bằng mật mã ngẫu nhiên an toàn (Crypto Random), chống đoán và chống trùng lặp
 */
export function generateCryptographicOrderSn(): string {
  const year = new Date().getFullYear();
  const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `DH-${year}-${randomHex}`;
}

/**
 * Băm cancellation token bằng SHA-256 trước khi lưu vào database
 */
export function hashCancellationToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
}

/**
 * So sánh cancellation token theo phương pháp timing-safe chống tấn công timing
 */
export function verifyCancellationToken(
  rawInputToken: string,
  storedTokenOrHash: string,
): boolean {
  if (!rawInputToken || !storedTokenOrHash) return false;
  const inputHash = crypto
    .createHash('sha256')
    .update(rawInputToken.trim())
    .digest('hex');

  // Hỗ trợ cả trường hợp token cũ lưu plaintext hoặc token mới lưu SHA-256 hash
  if (storedTokenOrHash.length === 64 && /^[0-9a-f]{64}$/i.test(storedTokenOrHash)) {
    const inputBuf = Buffer.from(inputHash, 'utf8');
    const storedBuf = Buffer.from(storedTokenOrHash.toLowerCase(), 'utf8');
    if (inputBuf.length !== storedBuf.length) return false;
    return crypto.timingSafeEqual(inputBuf, storedBuf);
  }

  // Fallback cho token cũ nếu có
  const legacyBuf = Buffer.from(rawInputToken.trim(), 'utf8');
  const targetBuf = Buffer.from(storedTokenOrHash.trim(), 'utf8');
  if (legacyBuf.length !== targetBuf.length) return false;
  return crypto.timingSafeEqual(legacyBuf, targetBuf);
}
