const cloudinary = require('cloudinary').v2;
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const ASSETS_DIR = path.resolve(__dirname, '../../frontend/public/assets');

async function uploadLocalFile(filename, folder) {
  const filePath = path.join(ASSETS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const res = await cloudinary.uploader.upload(filePath, {
    folder,
    resource_type: 'image',
    use_filename: true,
    unique_filename: false,
    overwrite: true,
  });
  return res.secure_url;
}

async function main() {
  console.log('🚀 Bắt đầu tải các file ảnh .png/.jpg lên Cloudinary...');

  // Upload KOL avatars
  const kolImages = [
    { file: 'kol-avatar-thang.jpg', key: 'thang', email: 'kol1@scanms.vn' },
    { file: 'kol-avatar-ha.jpg', key: 'ha', email: 'kol2@scanms.vn' },
    { file: 'kol-avatar-nhat.jpg', key: 'nhat', email: 'demo@scanms.vn' },
    { file: 'kol-avatar-nam.jpg', key: 'nam', email: 'thangntse184251@fpt.edu.vn' },
    { file: 'kol-avatar-depxinh.jpg', key: 'depxinh', email: 'test_kol_2026@example.com' },
    { file: 'kol-avatar-nghia.jpg', key: 'nghia', email: 'kol-fr31@scanms.test' },
  ];

  const kolUrls = {};
  for (const item of kolImages) {
    console.log(`Đang upload ảnh KOL: ${item.file}...`);
    const url = await uploadLocalFile(item.file, 'scanms/avatars');
    kolUrls[item.email] = url;
    console.log(`  ✔ Đã lưu lên Cloudinary: ${url}`);
  }

  // Upload Shop logos
  const shopImages = [
    { file: 'shop-sora-skin.jpg', slugPart: 'sora-skin' },
    { file: 'shop-techstore.jpg', slugPart: 'techstore' },
    { file: 'shop-real-db.jpg', slugPart: 'real-db' },
    { file: 'shop-flagship.jpg', slugPart: 'super-admin' },
    { file: 'shop-store-a.jpg', slugPart: 'store-a' },
    { file: 'shop-store-b.jpg', slugPart: 'store-b' },
    { file: 'shop-my-pham-xanh.jpg', slugPart: 'xanh' },
  ];

  const shopUrls = {};
  for (const item of shopImages) {
    console.log(`Đang upload logo Shop: ${item.file}...`);
    const url = await uploadLocalFile(item.file, 'scanms/logos');
    shopUrls[item.slugPart] = url;
    console.log(`  ✔ Đã lưu lên Cloudinary: ${url}`);
  }

  console.log('\n🔄 Đang cập nhật cơ sở dữ liệu PostgreSQL với link Cloudinary chính chủ...');

  const connectionString = process.env.DATABASE_URL;
  const isRemote = connectionString?.includes('supabase') || connectionString?.includes('pooler') || connectionString?.includes('sslmode');
  const pool = new Pool({
    connectionString,
    max: 2,
    ssl: isRemote ? { rejectUnauthorized: false } : undefined,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  // Update Stores
  const stores = await prisma.store.findMany();
  for (const s of stores) {
    let matchedLogo = null;
    for (const [slugKey, url] of Object.entries(shopUrls)) {
      if (s.slug.toLowerCase().includes(slugKey) || s.name.toLowerCase().includes(slugKey)) {
        matchedLogo = url;
        break;
      }
    }
    if (!matchedLogo) {
      matchedLogo = shopUrls['sora-skin'];
    }

    await prisma.store.update({
      where: { id: s.id },
      data: { logoUrl: matchedLogo },
    });
    console.log(`  ✔ Shop "${s.name}" -> Cloudinary: ${matchedLogo}`);
  }

  // Update KOLs
  const collabs = await prisma.collaboratorProfile.findMany({
    include: { user: true },
  });
  for (const c of collabs) {
    const email = c.user?.email?.toLowerCase() || '';
    const matchedAvatar = kolUrls[email] || kolUrls['kol1@scanms.vn'];

    await prisma.collaboratorProfile.update({
      where: { id: c.id },
      data: { avatarUrl: matchedAvatar },
    });
    console.log(`  ✔ KOL "${c.user?.fullName}" (${email}) -> Cloudinary: ${matchedAvatar}`);
  }

  console.log('\n🎉 TẤT CẢ ẢNH ĐẠI DIỆN ĐÃ ĐƯỢC LƯU VÀO CLOUDINARY & CẬP NHẬT VÀO DATABASE THÀNH CÔNG!');

  await prisma.$disconnect();
  await pool.end();
}

main().catch(err => {
  console.error('Lỗi khi tải lên Cloudinary:', err);
  process.exit(1);
});
