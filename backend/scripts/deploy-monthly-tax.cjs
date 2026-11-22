require('dotenv/config');
const { spawnSync } = require('node:child_process');
// Prisma migrations need session pooling, not Supabase's transaction pool on 6543.
const url = new URL(process.env.DATABASE_URL);
if (url.hostname.endsWith('.pooler.supabase.com') && url.port === '6543') url.port = '5432';
url.searchParams.delete('pgbouncer');
url.searchParams.set('connect_timeout', '15');
const result = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], {
  env: { ...process.env, DATABASE_URL: url.toString() }, stdio: 'inherit', timeout: 60000,
});
if (result.error) console.error(result.error.code || result.error.name);
process.exitCode = result.status ?? 1;
