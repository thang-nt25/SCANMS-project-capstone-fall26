require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function checkDb() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, fullName: true },
  });
  console.log('=== USERS (' + users.length + ') ===');
  console.log(users);

  const stores = await prisma.store.findMany({
    select: { id: true, name: true, slug: true, ownerId: true, isVerified: true },
  });
  console.log('=== STORES (' + stores.length + ') ===');
  console.log(stores);

  const products = await prisma.product.findMany({
    select: { id: true, title: true, storeId: true, price: true },
  });
  console.log('=== PRODUCTS (' + products.length + ') ===');
  console.log(products.slice(0, 5));

  const collabs = await prisma.storeCollaborator.findMany({
    include: {
      store: { select: { id: true, name: true } },
      collaborator: { select: { id: true, fullName: true, email: true } },
    },
  });
  console.log('=== STORE COLLABORATORS (' + collabs.length + ') ===');
  console.log(collabs);

  const convs = await prisma.conversation.findMany({
    include: {
      store: { select: { id: true, name: true } },
      collaborator: { select: { id: true, fullName: true } },
      chatMessages: { take: 2 },
    },
  });
  console.log('=== CONVERSATIONS (' + convs.length + ') ===');
  console.log(convs.map(c => ({
    id: c.id,
    storeId: c.storeId,
    storeName: c.store?.name,
    collaboratorId: c.collaboratorId,
    collaboratorName: c.collaborator?.fullName,
    messagesCount: c.chatMessages.length,
  })));
}

checkDb()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
