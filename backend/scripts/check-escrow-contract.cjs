require('dotenv/config');
const {PrismaClient}=require('@prisma/client');
const {PrismaPg}=require('@prisma/adapter-pg');
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
(async()=>{try {
 const admin=await db.user.findFirst({where:{role:{in:['SYSTEM_MANAGER','SYSTEM_ADMIN']},isActive:true,isDeleted:false},select:{id:true,role:true,email:true}});
 const token=require('jsonwebtoken').sign({sub:admin.id,role:admin.role,email:admin.email},process.env.JWT_SECRET,{expiresIn:'3m'});
 for(const origin of ['http://localhost:3000','http://localhost:5173']) {
 const response=await fetch(origin+'/api/admin/payouts/escrow',{headers:{Authorization:`Bearer ${token}`,'Cache-Control':'no-cache'}});
 const body=await response.json();const data=body.data||body;
 console.log(JSON.stringify({origin,status:response.status,rows:data.items?.map(i=>({id:i.id,standard:i.pendingStandardAmount,deal:i.pendingDealAmount,rawBase:i.baseCommissionAmount,rawDeal:i.dealBonusAmount,state:i.dealBonusStatus}))}));
 }
} finally{await db.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
