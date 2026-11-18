// Uses existing local credentials privately; never prints tokens or account data.
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('../backend/node_modules/dotenv');
const source = dotenv.parse(fs.readFileSync(path.join(__dirname, '../frontend/.env')));
const origin = 'https://scanms.io.vn';
const unwrap = value => value?.data ?? value;
const checks = [];
async function request(route, token, body) {
  const response = await fetch(origin + '/api' + route, {
    method: body ? 'POST' : 'GET', signal: AbortSignal.timeout(30000),
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? {'Content-Type':'application/json'} : {}) },
    ...(body ? {body:JSON.stringify(body)} : {}),
  });
  const value = await response.json().catch(() => ({}));
  return { status: response.status, data: unwrap(value) };
}
const plans = {
  CUSTOMER: ['/auth/me','/customer/profile','/customer/orders','/customer/cart','/customer/addresses','/wallets/me','/wallets/top-up-demo/availability','/wallets/top-up-payos/availability'],
  KOL: ['/auth/me','/dashboard/kol','/wallets/me','/chat/conversations'],
  SHOP: ['/auth/me','/stores/my-store','/products','/orders/my-store','/returns/shop','/sample-requests/shop','/store-collaborators/shop','/affiliate-deals/shop','/chat/conversations'],
  MANAGER: ['/auth/me','/admin/return-disputes/queue?kind=disputes','/products/moderation'],
  ADMIN: ['/auth/me','/stores/all-admin','/admin/return-disputes/queue?kind=ghn'],
};
(async () => {
  for (const [role, routes] of Object.entries(plans)) {
    const identifier = source[`VITE_DEMO_${role}_IDENTIFIER`];
    const password = source[`VITE_DEMO_${role}_PASSWORD`];
    if (!identifier || !password) { console.log(role + ': no local test credentials'); continue; }
    const login = await request('/auth/login', null, {identifier,password});
    const token = login.data?.accessToken;
    console.log(role + ': login HTTP ' + login.status + (token ? ' OK' : ' FAILED'));
    checks.push({role,route:'/auth/login',status:login.status});
    if (!token) continue;
    for (const route of routes) {
      const result = await request(route,token);
      const record = {role,route,status:result.status};
      if (route.includes('/availability')) record.available = result.data?.available;
      checks.push(record); console.log(JSON.stringify(record));
    }
  }
  const report = {at:new Date().toISOString(),origin,checks};
  fs.writeFileSync(path.join(__dirname,'domain-audit.local.json'),JSON.stringify(report,null,2));
  if (checks.some(check=>check.status>=400)) process.exitCode=1;
})().catch(error=>{console.error('Audit interrupted: '+error.name);process.exitCode=1;});
