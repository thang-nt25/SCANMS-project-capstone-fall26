// Keep secrets in ignored files; never print their values.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dotenv = require('../backend/node_modules/dotenv');
const base = __dirname;
const source = dotenv.parse(fs.readFileSync(path.join(base, '../backend/.env')));
const frontend = dotenv.parse(fs.readFileSync(path.join(base, '../frontend/.env')));
const previousPath = path.join(base, 'backend.env');
const previous = fs.existsSync(previousPath) ? dotenv.parse(fs.readFileSync(previousPath)) : {};
if (!source.DATABASE_URL || !source.JWT_SECRET) throw new Error('Database URL and JWT secret are required');
const env = {
  ...source,
  DOMAIN: 'scanms.io.vn',
  ACME_EMAIL: source.GMAIL_USER || '',
  NODE_ENV: 'production',
  PORT: '3000',
  FRONTEND_URL: 'https://scanms.io.vn',
  PUBLIC_APP_URL: 'https://scanms.io.vn',
  PUBLIC_WEB_URL: 'https://scanms.io.vn',
  PAYOS_STOREFRONT_URL: 'https://scanms.io.vn',
  ALLOW_DEMO_WALLET_TOPUP: 'false',
  ALLOW_HOSTED_SHIPPING_SIMULATION: 'true',
  CORS_ORIGINS: 'https://scanms.io.vn',
  GOOGLE_CALLBACK_URL: 'https://api.scanms.io.vn/api/auth/google/callback',
  VITE_GOOGLE_CLIENT_ID: frontend.VITE_GOOGLE_CLIENT_ID || source.GOOGLE_CLIENT_ID || '',
  REDIS_URL: '',
  REDIS_HOST: '172.30.94.10',
  REDIS_PORT: '6379',
  REDIS_PASSWORD: previous.REDIS_PASSWORD || crypto.randomBytes(32).toString('hex'),
  REDIS_TLS: 'false',
  JWT_REFRESH_SECRET: source.JWT_REFRESH_SECRET || previous.JWT_REFRESH_SECRET || crypto.randomBytes(48).toString('hex'),
  DISABLE_SCHEDULED_JOBS: previous.DISABLE_SCHEDULED_JOBS || 'true',
  ORDER_CONFIRMATION_EMAIL_WORKER_DISABLED: previous.ORDER_CONFIRMATION_EMAIL_WORKER_DISABLED || 'true',
  DB_POOL_MAX: '5',
  TRUST_PROXY: 'true',
  TRUSTED_PROXIES: '172.30.94.0/24',
  SEMANTIC_MODEL_CACHE_DIR: '/app/semantic-models',
  SEMANTIC_ALLOW_DOWNLOAD: 'true',
};
for (const key of Object.keys(env)) {
  if (key.startsWith('VITE_DEMO_') || key === 'VITE_ENABLE_DEMO_LOGIN') delete env[key];
}
// Compose's env-file reader interprets $$ as a literal dollar sign.
fs.writeFileSync(previousPath, Object.entries(env).map(([key, value]) =>
  key + '=' + JSON.stringify(String(value)).replace(/\$/g, () => '$$')
).join('\n') + '\n', { mode: 0o600 });
console.log('Prepared private VPS environment; secrets not displayed.');
