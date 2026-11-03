import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/utils/chat-explorer.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { chatContentUrl, chatContentText, parseChatContent, parseCampaignCard } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('shared content URLs preserve their destination and resolve internal files', () => {
  assert.equal(chatContentUrl('/uploads/bao-gia.pdf', 'https://scanms.vn/merchant/customer-messages'), 'https://scanms.vn/uploads/bao-gia.pdf');
  assert.equal(chatContentUrl('https://cdn.example.test/a.mp4?download=1'), 'https://cdn.example.test/a.mp4?download=1');
  for (const value of ['javascript:alert(1)', 'data:text/html,test', '//other.test/file', 'file:///secret', 'https://user:pass@example.test/file', 'not-a-url']) {
    assert.equal(chatContentUrl(value, 'https://scanms.vn'), undefined);
  }
});

test('search summaries retain titles, voucher codes and commercial details', () => {
  assert.equal(chatContentText(JSON.stringify({ type: 'PRODUCT_INQUIRY', productTitle: 'Mặt nạ', message: 'Shop gợi ý' })), 'Mặt nạ\nShop gợi ý');
  assert.match(chatContentText(JSON.stringify({ type: 'COUPON_VOUCHER', couponCode: 'SHOP10', storeName: 'Gian hàng A' })), /SHOP10/);
  const summary = chatContentText(JSON.stringify({ type: 'EXCLUSIVE_DEAL_PROPOSAL', productTitle: 'Sữa rửa mặt', proposedCommissionRate: 15, salesCommitment: '10 đơn', status: 'PENDING' }));
  assert.match(summary, /Sữa rửa mặt/);
  assert.match(summary, /15%/);
  assert.match(summary, /10 đơn/);
  assert.match(summary, /Chờ duyệt/);
});

test('ordinary messages and unknown structured messages keep their original content', () => {
  for (const text of ['Tin nhắn thường', 'null', '{"foo":"bar"}', '{"type":"UNKNOWN","value":"Nội dung"}']) {
    assert.equal(chatContentText(text), text);
  }
  assert.equal(parseChatContent('null'), null);
  assert.equal(parseChatContent('[]'), null);
});

test('campaign invitations and decisions are recognized without treating regular messages as cards', () => {
  for (const type of ['CAMPAIGN_INVITE', 'CAMPAIGN_ACCEPTED', 'CAMPAIGN_REJECTED']) {
    const card = { type, campaignId: 'test', campaignName: 'Chiến dịch', participantId: 'participant' };
    assert.deepEqual(parseCampaignCard(JSON.stringify(card)), card);
  }
  for (const text of ['hello', 'null', '[]', '{', '{"type":"PRODUCT_INQUIRY"}']) {
    assert.equal(parseCampaignCard(text), null);
  }
});
