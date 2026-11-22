require('dotenv/config');
const {PrismaClient}=require('@prisma/client');const {PrismaPg}=require('@prisma/adapter-pg');
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
(async()=>{try{
 const user=await db.user.findFirst({where:{role:'COLLABORATOR',isActive:true,isDeleted:false},select:{id:true}});
 await db.$transaction(async tx=>{ await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`payout-monthly-tax:${user.id}`}, 0))`; });
 console.log('Original tax lock query succeeded');
}catch(e){ console.log(JSON.stringify({name:e.name,code:e.code,voidDeserialization:/void|deserialize|Unsupported column/i.test(String(e.message)),prismaCode:e.meta?.code})); }finally{await db.$disconnect();}})();
