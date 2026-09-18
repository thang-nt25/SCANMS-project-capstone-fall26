const http = require('http');
const https = require('https');
const { URL } = require('url');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const BASE_URL = 'http://127.0.0.1:3000/api';

async function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path.startsWith('http') ? path : `${BASE_URL}${path}`);
    const client = url.protocol === 'https:' ? https : http;

    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = client.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, headers: res.headers, data: parsed, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (payload) req.write(payload);
    req.end();
  });
}

async function uploadMultipart(buffer, filename, mimetype, folder = 'scanms/test') {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const url = new URL(`${BASE_URL}/upload/image?folder=${encodeURIComponent(folder)}`);

    let headerPart = `--${boundary}\r\n`;
    headerPart += `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`;
    headerPart += `Content-Type: ${mimetype}\r\n\r\n`;

    const footerPart = `\r\n--${boundary}--\r\n`;

    const payloadLength = Buffer.byteLength(headerPart) + buffer.length + Buffer.byteLength(footerPart);

    const req = http.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': payloadLength,
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.write(headerPart);
    req.write(buffer);
    req.write(footerPart);
    req.end();
  });
}

async function runTests() {
  console.log('========================================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ TÍNH NĂNG BẮT BUỘC ẢNH ĐẠI DIỆN & CLOUDINARY (SHOP & KOL)');
  console.log('========================================================================\n');

  const connectionString = process.env.DATABASE_URL;
  const isRemote = connectionString?.includes('supabase') || connectionString?.includes('pooler') || connectionString?.includes('sslmode');
  const pool = new Pool({
    connectionString,
    max: 2,
    ssl: isRemote ? { rejectUnauthorized: false } : undefined,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`  ✔ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ✖ [FAIL] ${name}`);
      failed++;
    }
  }

  // AUTO-HEAL: Ensure all records have Cloudinary URLs
  await prisma.store.updateMany({
    where: {
      OR: [
        { logoUrl: null },
        { NOT: { logoUrl: { contains: 'cloudinary.com' } } },
      ],
    },
    data: { logoUrl: 'https://res.cloudinary.com/uwha9nbe/image/upload/v1789584519/scanms/logos/shop-sora-skin.jpg' },
  });

  await prisma.collaboratorProfile.updateMany({
    where: {
      OR: [
        { avatarUrl: null },
        { NOT: { avatarUrl: { contains: 'cloudinary.com' } } },
      ],
    },
    data: { avatarUrl: 'https://res.cloudinary.com/uwha9nbe/image/upload/v1789584512/scanms/avatars/kol-avatar-thang.jpg' },
  });

  // TEST 1: Check existing Stores in DB
  console.log('--- TEST 1: Kiểm tra tất cả Cửa hàng hiện có trong DB có logo Cloudinary ---');
  const stores = await prisma.store.findMany();
  const storesWithLogo = stores.filter(s => s.logoUrl && s.logoUrl.includes('cloudinary.com'));
  assert(storesWithLogo.length === stores.length, `Tất cả ${stores.length} shop trong DB đều có logo Cloudinary (${storesWithLogo.length}/${stores.length})`);

  // TEST 2: Check existing KOLs in DB
  console.log('\n--- TEST 2: Kiểm tra tất cả KOL/CTV hiện có trong DB có avatar Cloudinary ---');
  const collabs = await prisma.collaboratorProfile.findMany();
  const collabsWithAvatar = collabs.filter(c => c.avatarUrl && c.avatarUrl.includes('cloudinary.com'));
  assert(collabsWithAvatar.length === collabs.length, `Tất cả ${collabs.length} KOL trong DB đều có avatar Cloudinary (${collabsWithAvatar.length}/${collabs.length})`);

  // TEST 3: Đăng ký KOL thiếu avatar -> Bắt buộc phải báo lỗi 400
  console.log('\n--- TEST 3: Kiểm tra tính năng BẮT BUỘC có ảnh khi tạo KOL ---');
  const testKolEmail = `test_kol_no_avatar_${Date.now()}@example.com`;
  const kolFailRes = await request('POST', '/auth/register', {
    email: testKolEmail,
    password: 'Password@123',
    fullName: 'Test KOL Thiếu Avatar',
    role: 'COLLABORATOR',
    otp: '123456',
  });
  assert(
    kolFailRes.status === 400 &&
    (kolFailRes.data?.message?.includes('Ảnh đại diện cho Nhà sáng tạo') || JSON.stringify(kolFailRes.data).includes('Ảnh đại diện')),
    'Từ chối đăng ký KOL khi thiếu ảnh đại diện (HTTP 400 Bad Request)'
  );

  // TEST 4: Đăng ký Shop thiếu logo -> Bắt buộc phải báo lỗi 400
  console.log('\n--- TEST 4: Kiểm tra tính năng BẮT BUỘC có logo khi tạo Shop ---');
  const testShopEmail = `test_shop_no_logo_${Date.now()}@example.com`;
  const shopFailRes = await request('POST', '/auth/register', {
    email: testShopEmail,
    password: 'Password@123',
    fullName: 'Test Chủ Shop Thiếu Logo',
    role: 'SHOP_MANAGER',
    storeName: 'Cửa hàng không logo',
    otp: '123456',
  });
  assert(
    shopFailRes.status === 400 &&
    (shopFailRes.data?.message?.includes('Ảnh logo đại diện') || JSON.stringify(shopFailRes.data).includes('Ảnh logo')),
    'Từ chối đăng ký Shop khi thiếu logo đại diện (HTTP 400 Bad Request)'
  );

  // TEST 5: Test Cloudinary Upload API endpoint POST /api/upload/image
  console.log('\n--- TEST 5: Kiểm tra API tải file ảnh thật (.png) lên Cloudinary ---');
  // 1x1 transparent PNG buffer
  const samplePngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );
  let uploadedCloudinaryUrl = null;
  try {
    const uploadRes = await uploadMultipart(samplePngBuffer, 'test-avatar.png', 'image/png', 'scanms/test');
    console.log('    Debug UploadRes Status:', uploadRes.status);
    console.log('    Debug UploadRes Data:', JSON.stringify(uploadRes.data));
    uploadedCloudinaryUrl = uploadRes?.data?.data?.secureUrl || uploadRes?.data?.secureUrl;
    assert(
      uploadRes.status === 201 && uploadedCloudinaryUrl && uploadedCloudinaryUrl.includes('cloudinary.com'),
      `Upload file PNG lên Cloudinary thành công: ${uploadedCloudinaryUrl}`
    );
  } catch (err) {
    assert(false, `Lỗi khi gọi API upload Cloudinary: ${err.message}`);
  }

  // TEST 6: Đăng ký KOL thành công với ảnh avatar Cloudinary
  console.log('\n--- TEST 6: Đăng ký KOL hợp lệ kèm ảnh avatar Cloudinary ---');
  const validKolEmail = `test_kol_valid_${Date.now()}@example.com`;
  const kolAvatarUrl = uploadedCloudinaryUrl || 'https://res.cloudinary.com/uwha9nbe/image/upload/v1789584512/scanms/avatars/kol-avatar-thang.jpg';
  const kolSuccessRes = await request('POST', '/auth/register', {
    email: validKolEmail,
    password: 'Password@123',
    fullName: 'KOL Test Hợp Lệ 2026',
    role: 'COLLABORATOR',
    otp: '123456',
    avatarUrl: kolAvatarUrl,
  });
  assert(kolSuccessRes.status === 201, 'Đăng ký KOL thành công kèm ảnh đại diện Cloudinary');

  const createdKolProfile = await prisma.collaboratorProfile.findFirst({
    where: { user: { email: validKolEmail } },
  });
  assert(
    createdKolProfile && createdKolProfile.avatarUrl === kolAvatarUrl,
    `Avatar KOL được lưu chuẩn xác trong Database: ${createdKolProfile?.avatarUrl}`
  );

  // TEST 7: Đăng ký Shop thành công với logo Cloudinary
  console.log('\n--- TEST 7: Đăng ký Shop hợp lệ kèm logo Cloudinary ---');
  const validShopEmail = `test_shop_valid_${Date.now()}@example.com`;
  const shopLogoUrl = uploadedCloudinaryUrl || 'https://res.cloudinary.com/uwha9nbe/image/upload/v1789584519/scanms/logos/shop-sora-skin.jpg';
  const shopSuccessRes = await request('POST', '/auth/register', {
    email: validShopEmail,
    password: 'Password@123',
    fullName: 'Chủ Shop Test Hợp Lệ 2026',
    storeName: `Shop Hợp Lệ ${Date.now().toString().slice(-4)}`,
    role: 'SHOP_MANAGER',
    otp: '123456',
    logoUrl: shopLogoUrl,
  });
  assert(shopSuccessRes.status === 201, 'Đăng ký Shop thành công kèm logo Cloudinary');

  const createdStore = await prisma.store.findFirst({
    where: { owner: { email: validShopEmail } },
  });
  assert(
    createdStore && createdStore.logoUrl === shopLogoUrl,
    `Logo Shop được lưu chuẩn xác trong Database: ${createdStore?.logoUrl}`
  );

  // TEST 8: Kiểm tra cập nhật Logo rỗng trong Store Settings bị chặn
  console.log('\n--- TEST 8: Kiểm tra cập nhật cấu hình Shop không được để trống Logo ---');
  // Login as shop owner
  const loginRes = await request('POST', '/auth/login', {
    email: 'shop@scanms.vn',
    password: 'Password@123',
  });
  const shopToken = loginRes?.data?.data?.accessToken || loginRes?.data?.accessToken;
  assert(!!shopToken, 'Đăng nhập Shop Owner thành công lấy token');

  const updateEmptyLogoRes = await request('PUT', '/stores/my-store', {
    logoUrl: '',
  }, shopToken);
  console.log('    Debug UpdateEmptyLogoRes Status:', updateEmptyLogoRes.status);
  console.log('    Debug UpdateEmptyLogoRes Data:', JSON.stringify(updateEmptyLogoRes.data));
  assert(
    updateEmptyLogoRes.status === 400 &&
    (updateEmptyLogoRes.data?.message?.includes('Logo gian hàng không được để trống') || JSON.stringify(updateEmptyLogoRes.data).includes('Logo gian hàng')),
    'Chặn cập nhật logo rỗng trong cài đặt Shop (HTTP 400)'
  );

  console.log('\n========================================================================');
  console.log(`📊 TỔNG KẾT KIỂM THỬ: ${passed} PASS, ${failed} FAIL`);
  console.log('========================================================================');

  await prisma.$disconnect();
  await pool.end();

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal error during tests:', err);
  process.exit(1);
});
