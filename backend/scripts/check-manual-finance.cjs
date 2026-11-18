require('dotenv/config');
const assert=require('node:assert/strict');
const jwt=require('jsonwebtoken');
const {PrismaClient,Prisma}=require('@prisma/client');
const {PrismaPg}=require('@prisma/adapter-pg');
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:12000})});
const isTest=row=>row.transferProvider==='BIDV_SANDBOX'||row.bankRefCode?.startsWith('SBX-');
(async()=>{try{
  const completed=await db.payoutRequest.findMany({where:{status:'APPROVED'}});
  const actual=completed.filter(row=>!isTest(row));
  for(const role of ['SYSTEM_MANAGER','SYSTEM_ADMIN']){
    const user=await db.user.findFirst({where:{role,isActive:true,isDeleted:false}});assert(user);
    const headers={Authorization:`Bearer ${jwt.sign({sub:user.id,email:user.email,role:user.role},process.env.JWT_SECRET,{expiresIn:'2m'})}`};
    const get=async path=>{const r=await fetch(`http://localhost:3000/api${path}`,{headers,signal:AbortSignal.timeout(30000)});assert.equal(r.status,200);const json=await r.json();return json.data??json;};
    const stats=await get('/admin/payouts/stats');assert.equal(stats.approved.count,actual.length);
    assert.equal(stats.approved.netAmount,actual.reduce((sum,row)=>sum.add(row.netAmount),new Prisma.Decimal(0)).toFixed(2));
    const tax=await get('/admin/payouts/tax-report?yearMonth=2026-11');assert(tax.items.every(row=>!isTest(row)));
    for(const path of ['/admin/payouts/gateway','/admin/payouts/bidv-sandbox/configuration']){
      const response=await fetch(`http://localhost:3000/api${path}`,{headers,signal:AbortSignal.timeout(10000)});assert.equal(response.status,404,`Retired route ${path} must be absent`);
    }
    for(const action of ['approve','reconcile']){
      const response=await fetch(`http://localhost:3000/api/payouts/00000000-0000-4000-8000-000000000000/${action}`,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({expectedNetAmount:'0'}),signal:AbortSignal.timeout(10000)});assert.equal(response.status,404,`Retired API ${action} must be absent`);
    }
    console.log(JSON.stringify({role,manualOnly:true,bankApiRoutes:'REMOVED',actualApproved:stats.approved.count,actualTaxRows:tax.items.length,actualTax:tax.tax,historicalTestRowsRetained:completed.length-actual.length}));
  }
}catch(error){console.error(error.message?.replace(/postgres(?:ql)?:\/\/\S+/g,'[redacted]'));process.exitCode=1;}finally{await db.$disconnect();}})();
