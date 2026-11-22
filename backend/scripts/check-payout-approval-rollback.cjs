require('dotenv/config');const assert=require('node:assert/strict');const {PrismaClient}=require('@prisma/client');const {PrismaPg}=require('@prisma/adapter-pg');const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
(async()=>{try{
 const {AdminPayoutsController}=require('../dist/modules/payouts/admin-payouts.controller');
 const id='6c9991da-171b-4b50-8b1d-b57631ad7508';const before=await db.payoutRequest.findUniqueOrThrow({where:{id}});const actor=await db.user.findFirst({where:{role:'SYSTEM_MANAGER',isActive:true,isDeleted:false},select:{id:true,role:true}});const rollback=new Error('EXPECTED_ROLLBACK');let stage='before-transaction';
 const facade={payoutRequest:db.payoutRequest,$transaction:work=>db.$transaction(async tx=>{stage='approval-transaction';await work(tx);stage='all-approval-steps-passed';throw rollback;},{timeout:15000})};
 const bills={validateBill:()=>{},uploadBill:async()=>({publicId:'ROLLBACK_ONLY',secureUrl:'https://example.invalid/rollback-only.png',format:'png',sha256:'0'.repeat(64)}),removeUnusedBill:async()=>{}};
 const controller=new AdminPayoutsController(facade,{serializePayout:row=>({id:row.id,status:row.status})},{},bills,{});
 try{await controller.approve(id,actor,{bankRefCode:'GD-20261114-0001',expectedNetAmount:before.netAmount.toFixed(2)},{})}catch(e){if(e!==rollback){console.log(JSON.stringify({stage,name:e.name,code:e.code,message:String(e.message).replace(/postgres(?:ql)?:\/\/\S+/g,'[redacted]').slice(-1200)}));process.exitCode=1;}}
 const after=await db.payoutRequest.findUniqueOrThrow({where:{id}});assert.deepEqual(after,before);console.log(JSON.stringify({stage,originalPayoutUnchanged:true}));
 }finally{await db.$disconnect();}})().catch(e=>{console.error(JSON.stringify({name:e.name,code:e.code}));process.exitCode=1;});
