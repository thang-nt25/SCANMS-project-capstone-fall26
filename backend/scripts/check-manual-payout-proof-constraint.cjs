require('dotenv/config');const assert=require('node:assert/strict');const {PrismaClient}=require('@prisma/client');const {PrismaPg}=require('@prisma/adapter-pg');const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
(async()=>{try{
 const id='6c9991da-171b-4b50-8b1d-b57631ad7508';const before=await db.payoutRequest.findUniqueOrThrow({where:{id}});const actor=await db.user.findFirst({where:{role:'SYSTEM_MANAGER',isActive:true,isDeleted:false},select:{id:true}});
 const valid={status:'APPROVED',transferProvider:'MANUAL',approvedById:actor.id,processedAt:new Date(),bankRefCode:'ROLLBACK-PROOF-CHECK',proofImagePublicId:'ROLLBACK_ONLY',proofImageFormat:'png',proofImageSha256:'0'.repeat(64)};
 const cases=[{bankRefCode:null},{bankRefCode:''},{proofImagePublicId:null},{proofImageFormat:null},{proofImageSha256:null},{proofImageSha256:'bad-hash'},{approvedById:null},{processedAt:null}];
 for(const invalid of cases){let blocked=false;try{await db.$transaction(async tx=>{await tx.payoutRequest.update({where:{id},data:{...valid,...invalid}});throw Error('UNEXPECTEDLY_ACCEPTED');});}catch(e){blocked=String(e.message).includes('payouts_approval_proof_check');}assert.equal(blocked,true,JSON.stringify(invalid));}
 assert.deepEqual(await db.payoutRequest.findUnique({where:{id}}),before);
 console.log(JSON.stringify({invalidManualProofCasesBlocked:cases.length,originalPayoutUnchanged:true}));
}finally{await db.$disconnect();}})().catch(e=>{console.error(JSON.stringify({name:e.name,message:e instanceof assert.AssertionError?e.message:'Constraint verification failed'}));process.exitCode=1;});
