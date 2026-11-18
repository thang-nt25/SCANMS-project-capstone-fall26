require('dotenv/config');
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 12000, query_timeout: 12000 });
(async () => {
  try {
    await client.connect();
    console.log(JSON.stringify((await client.query('SELECT migration_name, finished_at IS NOT NULL AS applied FROM _prisma_migrations ORDER BY started_at DESC LIMIT 8')).rows));
    console.log(JSON.stringify((await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='payout_requests' AND column_name='tax_context'")).rows));
    console.log(JSON.stringify((await client.query("SELECT status, COUNT(*)::int AS count FROM payout_requests GROUP BY status")).rows));
    console.log(JSON.stringify((await client.query("SELECT status, amount::text, tax_amount::text, net_amount::text, tax_context FROM payout_requests WHERE status = 'PENDING' ORDER BY created_at, id")).rows));
    console.log(JSON.stringify((await client.query("SELECT to_char(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM') AS month, SUM(amount)::text AS total_gross, COALESCE(SUM(amount) FILTER (WHERE status='APPROVED'),0)::text AS approved_gross, COALESCE(SUM(amount) FILTER (WHERE status='PENDING'),0)::text AS pending_gross FROM payout_requests WHERE status IN ('PENDING','PROCESSING','APPROVED') GROUP BY collaborator_id, to_char(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM') ORDER BY month")).rows));
    const { PrismaClient } = require('@prisma/client');
    const { PrismaPg } = require('@prisma/adapter-pg');
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 12000 }) });
    try {
      const { payoutMonthlySummaries } = require('../dist/modules/payouts/payout-monthly-tax');
      const requests = await prisma.payoutRequest.findMany({ select: { collaboratorId: true, createdAt: true }, take: 100 });
      const totals = await payoutMonthlySummaries(prisma, requests);
      console.log(JSON.stringify({ apiMonthlySummaryGroups: totals.size, totals: [...totals.values()] }));
    } finally { await prisma.$disconnect(); }
  } catch (error) { console.error(error.code || error.name, error.message?.replace(/postgres(?:ql)?:\/\/\S+/g, '[redacted]')); process.exitCode = 1; }
  finally { await client.end(); }
})();
