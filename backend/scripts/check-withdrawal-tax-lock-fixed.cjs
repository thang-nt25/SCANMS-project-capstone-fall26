require('dotenv/config');
const assert=require('node:assert/strict');
const {PrismaClient,Prisma}=require('@prisma/client');const {PrismaPg}=require('@prisma/adapter-pg');
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
(async()=>{try{
 const {lockPayoutTax,lockPayoutTaxForRequest,monthlyPayoutTax}=require('../dist/modules/payouts/payout-monthly-tax');
 const request=await db.payoutRequest.findFirst({select:{id:true,collaboratorId:true}});
 assert.ok(request);
 const snapshot=async()=>({count:await db.payoutRequest.count({where:{collaboratorId:request.collaboratorId}}),wallet:await db.wallet.findUnique({where:{collaboratorId:request.collaboratorId},select:{availableBalance:true,pendingBalance:true}})});
 const before=JSON.stringify(await snapshot());
 for(const kind of ['creator','request'])await db.$transaction(async tx=>{
   if(kind==='creator')await lockPayoutTax(tx,request.collaboratorId); else await lockPayoutTaxForRequest(tx,request.id);
   const [competing]=await db.$transaction(other=>other.$queryRaw`SELECT pg_try_advisory_xact_lock(hashtextextended(${`payout-monthly-tax:${request.collaboratorId}`},0)) AS acquired`);
   assert.equal(competing.acquired,false,'Lock must still block another transaction');
   const tax=await monthlyPayoutTax(tx,request.collaboratorId,new Prisma.Decimal(200000));
   assert.ok(tax.netAmount.plus(tax.taxAmount).eq(200000));
   console.log(JSON.stringify({kind,prismaReadsLock:true,serializesConcurrentRequests:true,taxPreviewValid:true}));
 });
 const [released]=await db.$transaction(tx=>tx.$queryRaw`SELECT pg_try_advisory_xact_lock(hashtextextended(${`payout-monthly-tax:${request.collaboratorId}`},0)) AS acquired`);
 assert.equal(released.acquired,true);
 assert.equal(JSON.stringify(await snapshot()),before);
 console.log(JSON.stringify({lockReleased:true,noPayoutCreatedOrWalletChanged:true}));
}catch(e){ console.error(JSON.stringify({name:e.name,code:e.code,message:e instanceof assert.AssertionError?e.message:'Read-only lock verification failed'}));process.exitCode=1;}finally{await db.$disconnect();}})();
