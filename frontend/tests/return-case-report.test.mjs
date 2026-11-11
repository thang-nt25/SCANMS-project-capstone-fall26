import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/utils/return-case-report.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { buildReturnCaseReport } = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);

const fixture = {
  id: 'case-1', status: 'DISPUTED', reason: 'DAMAGED', details: 'Hàng vỡ khi mở hộp',
  imageUrls: ['https://example.com/customer-proof.jpg', 'javascript:alert(1)'],
  unboxingVideoUrl: null, submittedAt: '2026-11-01T10:00:00.000Z',
  order: { externalOrderSn: 'DH-42', storeName: 'Sora Skin', customerName: 'An', customerPhone: '0903000001', outboundGhnTrackingNumber: 'GHN-1' },
  items: [{ id: 'line-1', quantity: 1, unitPrice: 450000, orderItem: { product: { title: 'Serum 30 ml' } } }],
  shopResponse: 'Shop đề nghị GHN xem xét',
  events: [
    { id: 'event-2', type: 'LIABILITY_ASSESSED', createdAt: '2026-11-02T10:00:00.000Z', data: { liability: 'LOGISTICS_FAULT', notes: 'Bằng chứng vận đơn phù hợp' } },
    { id: 'event-1', type: 'SHOP_EVIDENCE_SUBMITTED', createdAt: '2026-11-01T11:00:00.000Z', data: { evidenceUrls: ['https://example.com/shop-proof.jpg'], details: 'Kiện nguyên vẹn khi bàn giao' } },
  ],
  customerShipment: null, exchangeShipment: null,
  refund: { amount: 450000, method: 'WALLET', status: 'SUCCEEDED', processedAt: '2026-11-03T10:00:00.000Z' },
  partnerIncome: { amount: 0, reversedAmount: 72000, status: 'REVERSED' },
  ghnClaim: { status: 'SUBMITTED', originalTrackingNumber: 'GHN-1', evidenceUrls: [], claimedAmount: 450000, updatedAt: '2026-11-03T11:00:00.000Z' },
  dispute: { id: 'dispute-1', reason: 'CUSTOMER_DISAGREES', details: 'Yêu cầu phân xử', status: 'OPEN' },
};

test('case report connects the return, liability, GHN claim, refund and KOL clawback', () => {
  const html = buildReturnCaseReport(fixture, new Date('2026-11-07T12:00:00.000Z'));
  for (const value of ['DH-42', 'Serum 30 ml', 'LOGISTICS_FAULT', 'GHN-1', '72.000', '450.000', 'Bằng chứng khách', 'Bằng chứng Shop']) {
    assert.ok(html.includes(value), `Missing ${value}`);
  }
  assert.ok(html.indexOf('SHOP_EVIDENCE_SUBMITTED') < html.indexOf('LIABILITY_ASSESSED'));
  assert.ok(html.includes('Dữ liệu tại thời điểm xuất'));
});

test('case report escapes user text and rejects executable evidence links', () => {
  const malicious = { ...fixture, details: '<img src=x onerror=alert(1)>', imageUrls: ['javascript:alert(1)', 'https://example.com/?q=" onclick="alert(1)'] };
  const html = buildReturnCaseReport(malicious);
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!html.includes('<img src=x onerror'));
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(!html.includes('onclick="alert(1)"'));
  assert.ok(html.includes('liên kết không hợp lệ'));
});
