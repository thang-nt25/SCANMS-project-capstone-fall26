require('dotenv/config');
const assert=require('node:assert/strict');const {PrismaClient,UserRole}=require('@prisma/client');const {PrismaPg}=require('@prisma/adapter-pg');
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
(async()=>{try{
 const {StoreMonthlyRewardsService}=require('../dist/modules/commission-rules/store-monthly-rewards.service');
 const policy=await db.storeMonthlyRewardPolicy.findFirst({where:{status:'REJECTED',yearMonth:'2026-12'}}); assert.ok(policy);
 const store=await db.store.findUniqueOrThrow({where:{id:policy.storeId},select:{ownerId:true}});
 const count=await db.auditLog.count({where:{action:'RESUBMIT_STORE_MONTHLY_REWARD',details:{path:['policyId'],equals:policy.id}}});
 const rollback=new Error('EXPECTED_TEST_ROLLBACK');let tested=false;
 const facade={store:db.store,$transaction:work=>db.$transaction(async tx=>{
   const result=await work(tx);assert.equal(result.status,'PENDING');assert.equal(result.id,policy.id);
   const row=await tx.storeMonthlyRewardPolicy.findUniqueOrThrow({where:{id:policy.id}});assert.equal(row.reviewNote,null);assert.equal(row.reviewedBy,null);assert.equal(row.targetRevenue.toFixed(2),'45000000.00');
   const audit=await tx.auditLog.findFirstOrThrow({where:{action:'RESUBMIT_STORE_MONTHLY_REWARD',details:{path:['policyId'],equals:policy.id}},orderBy:{createdAt:'desc'}});
   assert.equal(audit.details.previous.reviewNote,policy.reviewNote);assert.equal(audit.details.previous.rewardAmount,policy.rewardAmount.toFixed(2));tested=true;throw rollback;
 })};
 const service=new StoreMonthlyRewardsService(facade,{},{});
 try{await service.create({id:store.ownerId,role:UserRole.SHOP_MANAGER},policy.storeId,{yearMonth:policy.yearMonth,name:'Revised reward',targetRevenue:'45000000',rewardAmount:'1500000'});}catch(e){if(e!==rollback)throw e;}
 assert.equal(tested,true);assert.deepEqual(await db.storeMonthlyRewardPolicy.findUnique({where:{id:policy.id}}),policy);
 assert.equal(await db.auditLog.count({where:{action:'RESUBMIT_STORE_MONTHLY_REWARD',details:{path:['policyId'],equals:policy.id}}}),count);
 console.log(JSON.stringify({resubmitPassed:true,previousRejectionArchived:true,rolledBack:true,livePolicyAndAuditUnchanged:true}));
}finally{await db.$disconnect();}})().catch(e=>{console.error(JSON.stringify({name:e.name,code:e.code,message:e instanceof assert.AssertionError?e.message:'Resubmit rollback verification failed'}));process.exitCode=1;});
