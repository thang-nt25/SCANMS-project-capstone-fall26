import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function load(file) {
  const source = await readFile(new URL('../src/utils/' + file, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
}
const { accountMenuLinks } = await load('account-menu.ts');
const { notificationTarget, localNotificationAction } = await load('notification-target.ts');
const { headerNotificationSnapshot } = await load('header-notification-source.ts');
const routes = await readFile(new URL('../src/routes/AppRoutes.tsx', import.meta.url), 'utf8');
const registered = new Set([...routes.matchAll(/path="([^"]+)"/g)].map(match => '/' + match[1].replace(/^\//, '')));

test('each role has relevant links with registered destinations and no duplicate entries', () => {
  const expected = {
    CUSTOMER: ['/customer/orders', '/customer/wishlist', '/customer/vouchers', '/customer/wallet'],
    COLLABORATOR: ['/collaborator/dashboard', '/collaborator/wallet', '/collaborator/collaboration'],
    SHOP_MANAGER: ['/merchant/dashboard', '/merchant/orders', '/merchant/products'],
    SYSTEM_MANAGER: ['/admin/users', '/admin/product-moderation', '/admin/disputes'],
    SYSTEM_ADMIN: ['/admin/analytics', '/admin/users', '/admin/product-moderation'],
  };
  for (const [role, required] of Object.entries(expected)) {
    const links = accountMenuLinks(role);
    const targets = links.map(item => item.to);
    required.forEach(path => assert.ok(targets.includes(path), role + ' missing ' + path));
    assert.equal(new Set(targets).size, targets.length);
    for (const item of links) assert.ok(registered.has(item.to.split('?')[0]), 'unregistered menu route: ' + item.to);
    if (role !== 'CUSTOMER') assert.ok(!targets.includes('/customer/upgrade'), 'existing partners do not need a recruitment link');
    if (role === 'SYSTEM_MANAGER') assert.ok(!targets.includes('/admin/analytics'), 'operations menu does not advertise executive analytics');
  }
});

test('shopping with a partner account retains a return to the account workspace', () => {
  for (const role of ['COLLABORATOR', 'SHOP_MANAGER', 'SYSTEM_MANAGER', 'SYSTEM_ADMIN']) {
    const links = accountMenuLinks('CUSTOMER', role);
    assert.ok(links.some(item => item.to === accountMenuLinks(role)[0].to));
    assert.ok(!links.some(item => item.to === '/customer/upgrade'));
  }
});

test('invitations open the correct partner conversation; identifiers remain query data', () => {
  const target = notificationTarget({ type: 'CAMPAIGN_INVITE', data: { storeId: 'shop&tab=bad' } }, 'COLLABORATOR');
  const url = new URL(target, 'https://scanms.test');
  assert.equal(url.pathname, '/collaborator/collaboration');
  assert.equal(url.searchParams.get('tab'), 'messages');
  assert.equal(url.searchParams.get('shop'), 'shop&tab=bad');
  assert.equal(notificationTarget({ type: 'CAMPAIGN_ACCEPTED', data: { collaboratorId: 'kol-1' } }, 'SHOP_MANAGER'), '/merchant/kol-hub?tab=messages&kol=kol-1');
});

test('verification and finance notifications respect the recipient workspace', () => {
  assert.equal(notificationTarget({ type: 'KYC_PENDING' }, 'SYSTEM_MANAGER'), '/admin/users');
  assert.equal(notificationTarget({ type: 'KYC_REJECTED' }, 'COLLABORATOR'), '/collaborator/profile?tab=kyc');
  assert.equal(notificationTarget({ type: 'SHOP_NEEDS_INFO' }, 'CUSTOMER'), '/customer/upgrade/shop');
  assert.equal(notificationTarget({ type: 'KOL_REJECTED' }, 'CUSTOMER'), '/customer/upgrade/kol');
  assert.equal(notificationTarget({ type: 'PAYOUT_APPROVED', data: { payoutId: 'pay-1' } }, 'COLLABORATOR'), '/collaborator/wallet?payoutId=pay-1');
  assert.equal(notificationTarget({ type: 'PAYOUT_PENDING' }, 'SYSTEM_ADMIN'), '/admin/finance');
  assert.equal(notificationTarget({ type: 'UNKNOWN' }, 'CUSTOMER'), null);
});

test('notification actions accept internal routes only', () => {
  assert.equal(localNotificationAction('/customer/orders?orderId=1'), '/customer/orders?orderId=1');
  for (const value of [null, 1, 'https://other.test/', '//other.test/', '/\\other.test', 'javascript:alert(1)', '/path\nheader']) assert.equal(localNotificationAction(value), null);
});

test('signed-in notifications use account read state even when the same live exists locally', () => {
  const server = [{ id: 'server-live', type: 'LIVE_SESSION_BROADCAST', isRead: true, data: { sessionId: 'live-1' } }];
  const local = [{ id: 'local-live', type: 'LIVE_SESSION_BROADCAST', isRead: false, data: { sessionId: 'live-1' } }];
  assert.deepEqual(headerNotificationSnapshot(true, server, 0, local), { items: server, unreadCount: 0 });
  assert.deepEqual(headerNotificationSnapshot(false, [], 0, local), { items: local, unreadCount: 1 });
  assert.deepEqual(headerNotificationSnapshot(true, [], 0, local), { items: [], unreadCount: 0 }, 'another signed-in account does not inherit the local read state');
});
