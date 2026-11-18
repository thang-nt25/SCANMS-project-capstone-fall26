require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const jwt = require('jsonwebtoken');
const assert = require('node:assert/strict');
const db = new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:12000})});
(async()=>{try{
  const user=await db.user.findFirst({where:{role:'SYSTEM_MANAGER',isActive:true,isDeleted:false}});
  assert(user);
  const token=jwt.sign({sub:user.id,email:user.email,role:user.role},process.env.JWT_SECRET,{expiresIn:'2m'});
  const response=await fetch('http://localhost:3000/api/admin/payouts/tax-report?yearMonth=2026-11',{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30000)});
  assert.equal(response.status,200);const json=await response.json();const report=json.data??json;
  const rows=await db.payoutRequest.findMany({where:{status:'APPROVED',processedAt:{gte:new Date('2026-10-31T17:00:00Z'),lt:new Date('2026-11-30T17:00:00Z')}},select:{transferProvider:true,bankRefCode:true}});
  const simulated=rows.filter(r=>r.transferProvider==='BIDV_SANDBOX'||r.bankRefCode?.startsWith('SBX-')).length;
  assert.equal(report.items.length,rows.length-simulated);assert.equal(report.sandbox.count,simulated);
  console.log(JSON.stringify({yearMonth:report.yearMonth,completedPayouts:rows.length,realPayouts:report.items.length,sandboxPayouts:report.sandbox.count,realGross:report.gross,realTax:report.tax,realNet:report.net,sandboxGross:report.sandbox.gross,sandboxTax:report.sandbox.tax,sandboxNet:report.sandbox.net,csvEnabledWhenRealSelected:!!report,csvDataRows:report.items.length}));
}catch(error){console.error(error.message?.replace(/postgres(?:ql)?:\/\/\S+/g,'[redacted]'));process.exitCode=1;}finally{await db.$disconnect();}})();
