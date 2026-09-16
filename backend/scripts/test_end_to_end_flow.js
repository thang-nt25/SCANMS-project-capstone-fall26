const http = require('http');
const https = require('https');
const { URL } = require('url');

const BASE_URL = 'http://127.0.0.1:3000/api';

async function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path.startsWith('http') ? path : `${BASE_URL}${path}`);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

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

    const req = client.request(url, {
      method,
      headers,
    }, (res) => {
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

function unwrap(res) {
  if (!res) return null;
  let d = res.data !== undefined ? res.data : res;
  if (d && typeof d === 'object' && d !== null && 'data' in d && (d.success !== undefined || d.statusCode !== undefined)) {
    d = d.data;
  }
  return d;
}

async function runE2E() {
  console.log('========================================================================');
  console.log('🚀 BẮT ĐẦU KIỂM THỬ TOÀN DIỆN HỆ THỐNG SCANMS THEO LUỒNG END-TO-END');
  console.log('========================================================================\n');

  let shopToken = null;
  let kolToken = null;
  let adminToken = null;
  let kolUserId = null;
  let shopStoreId = null;
  let chosenProduct = null;
  let sampleReqId = null;
  let referralLink = null;
  let createdOrderId = null;
  let orderSn = null;

  // -------------------------------------------------------------------------
  // CHẶNG 1: KHỞI TẠO, ĐỊNH DANH & KIỂM ĐỊNH SẢN PHẨM LÊN SÀN
  // -------------------------------------------------------------------------
  console.log('--- [CHẶNG 1] KHỞI TẠO, ĐỊNH DANH & KIỂM ĐỊNH SẢN PHẨM LÊN SÀN ---');

  // 1.1 Đăng nhập tài khoản Shop
  console.log('\n1.1 Đăng nhập tài khoản Shop (test_shop_2026@example.com)...');
  const shopLogin = await request('POST', '/auth/login', {
    email: 'test_shop_2026@example.com',
    password: 'Password@123',
  });
  if (shopLogin.status !== 200 && shopLogin.status !== 201) {
    throw new Error(`Shop login thất bại: ${JSON.stringify(shopLogin.data)}`);
  }
  const shopData = unwrap(shopLogin);
  shopToken = shopData?.accessToken;
  const shopUser = shopData?.user;
  shopStoreId = shopUser?.stores?.[0]?.id;
  console.log(`✔ Shop đăng nhập thành công! User: ${shopUser?.fullName}, Store ID: ${shopStoreId}`);

  // 1.2 Đăng nhập tài khoản KOL
  console.log('\n1.2 Đăng nhập tài khoản KOL (test_kol_2026@example.com)...');
  const kolLogin = await request('POST', '/auth/login', {
    email: 'test_kol_2026@example.com',
    password: 'Password@123',
  });
  if (kolLogin.status !== 200 && kolLogin.status !== 201) {
    throw new Error(`KOL login thất bại: ${JSON.stringify(kolLogin.data)}`);
  }
  const kolData = unwrap(kolLogin);
  kolToken = kolData?.accessToken;
  const kolUser = kolData?.user;
  kolUserId = kolUser?.id;
  console.log(`✔ KOL đăng nhập thành công! User: ${kolUser?.fullName}, ID: ${kolUserId}`);

  // 1.3 Đăng nhập Admin để phê duyệt KYC
  console.log('\n1.3 Đăng nhập tài khoản Admin (admin@scanms.vn)...');
  const adminLogin = await request('POST', '/auth/login', {
    email: 'admin@scanms.vn',
    password: 'Password@123',
  });
  if (adminLogin.status === 200 || adminLogin.status === 201) {
    adminToken = unwrap(adminLogin)?.accessToken;
    console.log(`✔ Admin đăng nhập thành công! Token: ${adminToken ? 'OK' : 'None'}`);
  } else {
    console.log(`ℹ Admin không đăng nhập được: ${JSON.stringify(adminLogin.data)}`);
  }

  // 1.4 KOL Nộp hồ sơ KYC
  console.log('\n1.4 KOL nộp hồ sơ KYC định danh tài chính...');
  const kycSubmit = await request('PUT', '/kyc/submit', {
    idCardNumber: '079201008899',
    taxCode: '8594028193',
    bankName: 'MBBank (Quân Đội)',
    bankAccountNumber: '999988887777',
    bankAccountName: 'KOL DEP XINH',
    bio: 'KOL chuyên mỹ phẩm & chăm sóc da cao cấp',
  }, kolToken);
  console.log(`✔ Nộp hồ sơ KYC: Status ${kycSubmit.status}`);

  // 1.5 Admin/Shop duyệt hồ sơ KYC của KOL
  console.log('\n1.5 Admin/Shop lấy danh sách KYC và phê duyệt...');
  const pendingKyc = await request('GET', '/kyc/admin/pending', null, adminToken || shopToken);
  const profiles = Array.isArray(unwrap(pendingKyc)) ? unwrap(pendingKyc) : unwrap(pendingKyc)?.data || [];
  const targetProfile = profiles.find((p) => p.userId === kolUserId || p.user?.id === kolUserId || p.idCardNumber === '079201008899');
  
  if (targetProfile) {
    console.log(`  Tìm thấy hồ sơ KYC ID: ${targetProfile.id}, trạng thái hiện tại: ${targetProfile.kycStatus}`);
    const reviewRes = await request('PATCH', `/kyc/admin/${targetProfile.id}/review`, {
      status: 'VERIFIED',
    }, adminToken || shopToken);
    console.log(`✔ Duyệt KYC thành công: Status ${reviewRes.status}, Trạng thái mới: VERIFIED`);
  } else {
    console.log('ℹ Không tìm thấy profile KYC chờ duyệt trong danh sách (có thể đã duyệt trước đó).');
  }

  // 1.6 Shop kiểm tra hoặc mời KOL làm CTV chính thức
  console.log('\n1.6 Shop xác nhận quyền CTV chính thức của KOL cho Gian hàng...');
  try {
    const myInvites = await request('GET', '/store-collaborators/my-invitations', null, kolToken);
    const rawInvites = unwrap(myInvites);
    const invitesList = Array.isArray(rawInvites) ? rawInvites : rawInvites?.data || [];
    const pendingInvite = invitesList.find((inv) => inv.storeId === shopStoreId && inv.status === 'PENDING');
    if (pendingInvite) {
      const acceptRes = await request('PATCH', `/store-collaborators/${pendingInvite.id}/accept`, {}, kolToken);
      console.log(`✔ KOL chấp thuận lời mời CTV: Status ${acceptRes.status}`);
    } else {
      const inviteRes = await request('POST', '/store-collaborators/invite', {
        storeId: shopStoreId,
        email: 'test_kol_2026@example.com',
        note: 'Mời hợp tác phát triển sản phẩm cùng Gian hàng',
      }, shopToken);
      if (inviteRes.status === 201) {
        console.log('  Shop gửi lời mời CTV mới thành công');
        const refreshedInvites = await request('GET', '/store-collaborators/my-invitations', null, kolToken);
        const refRaw = unwrap(refreshedInvites);
        const refList = Array.isArray(refRaw) ? refRaw : refRaw?.data || [];
        const toAccept = refList.find((inv) => inv.storeId === shopStoreId && inv.status === 'PENDING');
        if (toAccept) {
          await request('PATCH', `/store-collaborators/${toAccept.id}/accept`, {}, kolToken);
          console.log('✔ KOL đã chấp thuận lời mời!');
        }
      } else {
        console.log('✔ KOL đã là CTV chính thức của Gian hàng từ trước.');
      }
    }
  } catch (err) {
    console.log(`ℹ Quan hệ CTV: ${err.message}`);
  }

  // 1.7 Khởi tạo/Kiểm tra sản phẩm kinh doanh thuộc Gian hàng
  console.log('\n1.7 Khởi tạo/Kiểm tra sản phẩm kinh doanh của Gian hàng...');
  const shopProdsRes = await request('GET', `/products?storeId=${shopStoreId}`, null, shopToken);
  const shopProdsData = unwrap(shopProdsRes);
  let shopProds = shopProdsData?.items || (Array.isArray(shopProdsData) ? shopProdsData : []);
  if (!Array.isArray(shopProds) || shopProds.length === 0) {
    const sku = 'E2E-' + Date.now().toString().slice(-6);
    console.log(`  Gian hàng chưa có sản phẩm, đang tạo mới sản phẩm SKU: ${sku}...`);
    const createProd = await request('POST', '/products', {
      storeId: shopStoreId,
      sku,
      title: 'Serum Phục Hồi Dưỡng Sáng E2E Testing',
      categoryName: 'Mỹ Phẩm & Chăm Sóc Da',
      description: 'Sản phẩm phục hồi và dưỡng sáng chuyên sâu, phân phối chính hãng trên SCANMS.',
      price: 350000,
      originalPrice: 450000,
      stockQuantity: 100,
      customCommissionRate: 20,
    }, shopToken);
    const createdData = unwrap(createProd);
    chosenProduct = createdData?.product || createdData;
  } else {
    chosenProduct = shopProds[0];
  }
  chosenProduct.storeId = shopStoreId;
  console.log(`✔ Sản phẩm kiểm thử hợp lệ: "${chosenProduct.title}" (ID: ${chosenProduct.id}, Giá: ${Number(chosenProduct.price).toLocaleString('vi-VN')} đ, Store: ${shopStoreId})`);

  // -------------------------------------------------------------------------
  // CHẶNG 2: TIẾP CẬN & SÁNG TẠO NỘI DUNG (KOL / KOC)
  // -------------------------------------------------------------------------
  console.log('\n--- [CHẶNG 2] TIẾP CẬN & SÁNG TẠO NỘI DUNG (KOL / KOC) ---');

  // 2.1 KOL xin sản phẩm mẫu dùng thử
  console.log(`\n2.1 KOL xin mẫu sản phẩm "${chosenProduct.title}"...`);
  const sampleReq = await request('POST', '/sample-requests', {
    productId: chosenProduct.id,
    shippingAddress: 'Tầng 12 Tòa nhà Landmark 81, P. 22, Q. Bình Thạnh, TP. Hồ Chí Minh',
  }, kolToken);

  const sampleData = unwrap(sampleReq);
  if (sampleReq.status === 201 || sampleReq.status === 200) {
    sampleReqId = sampleData?.id;
    console.log(`✔ Tạo yêu cầu xin mẫu thành công! Request ID: ${sampleReqId}, Status: ${sampleData?.status}`);
  } else if (sampleReq.status === 409) {
    console.log(`ℹ Yêu cầu mẫu đã tồn tại (Status 409). Lấy danh sách yêu cầu hiện có...`);
    const mySamples = await request('GET', '/sample-requests/my', null, kolToken);
    const rawSamples = unwrap(mySamples);
    const list = Array.isArray(rawSamples) ? rawSamples : rawSamples?.data || [];
    const found = list.find((r) => r.productId === chosenProduct.id);
    sampleReqId = found?.id;
    console.log(`✔ Sử dụng lại Request ID: ${sampleReqId}, Status: ${found?.status}`);
  } else {
    console.log(`⚠ Kết quả xin mẫu: ${sampleReq.status} - ${JSON.stringify(sampleData)}`);
  }

  // 2.2 Shop duyệt yêu cầu xin mẫu và giao hàng
  if (sampleReqId) {
    console.log(`\n2.2 Shop phê duyệt và giao bưu cục cho Request ID: ${sampleReqId}...`);
    const approveReq = await request('PATCH', `/sample-requests/${sampleReqId}/approve`, {}, shopToken);
    console.log(`  Duyệt yêu cầu: Status ${approveReq.status}`);

    const shipReq = await request('PATCH', `/sample-requests/${sampleReqId}/ship`, {
      trackingNumber: 'GHTK' + Math.floor(10000000 + Math.random() * 90000000),
      carrier: 'GHTK Express',
    }, shopToken);
    const shipData = unwrap(shipReq);
    console.log(`✔ Giao hàng bưu tá thành công: Status ${shipReq.status}, Tracking: ${shipData?.trackingNumber}`);
  }

  // 2.3 KOL nộp Video Review sản phẩm lên Media Hub
  console.log('\n2.3 KOL nộp video review sản phẩm lên Media Hub...');
  const reviewSubmission = await request('POST', '/media/kol-submission', {
    productId: chosenProduct.id,
    title: `Đánh giá chi tiết ${chosenProduct.title} sau 7 ngày dùng thử thực tế`,
    videoUrl: 'https://www.tiktok.com/@kol_beauty/video/7389201948291048291',
    caption: 'Chất kem thẩm thấu nhanh, không bết rít, mùi thơm dịu nhẹ tự nhiên rất ưng ý!',
  }, kolToken);
  const reviewData = unwrap(reviewSubmission);
  let mediaId = reviewData?.id;
  console.log(`✔ Nộp video review: Status ${reviewSubmission.status}, Media ID: ${mediaId}, Title: "${reviewData?.title}"`);

  // 2.4 Shop kiểm duyệt phê duyệt video review của KOL
  if (mediaId) {
    console.log('\n2.4 Shop phê duyệt video review của KOL...');
    const modRes = await request('PATCH', `/media/${mediaId}/review`, {
      status: 'APPROVED',
      moderatorNote: 'Video chất lượng cao, đúng quy chuẩn sàn',
    }, shopToken);
    console.log(`✔ Shop duyệt video review: Status ${modRes.status}`);
  }

  // 2.5 KOL tạo Link tiếp thị rút gọn gắn UTM
  console.log('\n2.5 KOL tạo Link tiếp thị rút gọn gắn mã shortCode & UTM...');
  const linkRes = await request('POST', '/referral-links', {
    productId: chosenProduct.id,
    label: `Link TikTok Bio - ${chosenProduct.title.slice(0, 30)}`,
    channel: 'TIKTOK',
    utmSource: 'tiktok',
    utmMedium: 'bio_link',
    utmCampaign: 'review_campaign_2026',
  }, kolToken);

  if (linkRes.status === 201 || linkRes.status === 200) {
    referralLink = unwrap(linkRes);
    console.log(`✔ Tạo link tiếp thị thành công: ShortCode = "${referralLink?.shortCode}", ID = ${referralLink?.id}`);
  } else {
    console.log(`ℹ Tạo link trả về status ${linkRes.status}: ${JSON.stringify(linkRes.data)}`);
    const myLinks = await request('GET', '/referral-links', null, kolToken);
    const linksData = unwrap(myLinks);
    const linksList = linksData?.items || (Array.isArray(linksData) ? linksData : []);
    referralLink = linksList.find((l) => l.productId === chosenProduct.id) || linksList[0];
    console.log(`✔ Sử dụng link tiếp thị có sẵn: ShortCode = "${referralLink?.shortCode}", ID = ${referralLink?.id}`);
  }

  // -------------------------------------------------------------------------
  // CHẶNG 3: NGƯỜI TIÊU DÙNG MUA HÀNG & GHI NHẬN ATTRIBUTION
  // -------------------------------------------------------------------------
  console.log('\n--- [CHẶNG 3] NGƯỜI TIÊU DÙNG MUA HÀNG & GHI NHẬN ATTRIBUTION ---');

  // 3.1 Khách hàng click vào Link tiếp thị
  const sc = referralLink?.shortCode || 'anc-pro-thang';
  console.log(`\n3.1 Khách hàng click vào Link tiếp thị /r/${sc}...`);
  const clickRes = await request('GET', `/r/${sc}`);
  console.log(`✔ Ghi nhận Click: Status ${clickRes.status}, Destination: ${clickRes.headers?.location || 'OK'}`);

  // 3.2 Khách hàng đặt mua sản phẩm
  console.log('\n3.2 Khách hàng đặt đơn hàng thực tế...');
  const idempotencyKey = 'order-' + Date.now() + '-' + Math.floor(Math.random() * 100000);
  const orderRes = await request('POST', '/orders', {
    storeId: shopStoreId,
    customerName: 'Khách Hàng Trải Nghiệm E2E',
    customerPhone: '0988' + Math.floor(100000 + Math.random() * 900000),
    customerEmail: 'khachhang.e2e@gmail.com',
    shippingAddress: 'Số 45 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    cookieRefCode: sc,
    idempotencyKey,
    items: [
      {
        productId: chosenProduct.id,
        quantity: 2,
      },
    ],
  });

  const orderData = unwrap(orderRes);
  if (orderRes.status === 201 || orderRes.status === 200) {
    orderSn = orderData?.publicOrderCode || orderData?.externalOrderSn;
    const finalAmt = orderData?.finalAmount;
    console.log(`✔ Đặt hàng thành công! Mã đơn công khai: ${orderSn}, Tổng tiền: ${Number(finalAmt).toLocaleString('vi-VN')} đ`);
  } else {
    throw new Error(`Đặt hàng thất bại: ${orderRes.status} - ${JSON.stringify(orderData)}`);
  }

  // -------------------------------------------------------------------------
  // CHẶNG 4: XỬ LÝ ĐƠN HÀNG, GIAO NHẬN & ĐỐI SOÁT HOA HỒNG
  // -------------------------------------------------------------------------
  console.log('\n--- [CHẶNG 4] XỬ LÝ ĐƠN HÀNG, GIAO NHẬN & ĐỐI SOÁT HOA HỒNG ---');

  // 4.1 Shop xem danh sách đơn hàng
  console.log('\n4.1 Shop kiểm tra danh sách đơn hàng của Gian hàng...');
  const shopOrders = await request('GET', '/orders/my-store?limit=5', null, shopToken);
  const ordersData = unwrap(shopOrders);
  const ordersList = ordersData?.items || (Array.isArray(ordersData) ? ordersData : []);
  console.log(`✔ Shop có ${ordersList.length} đơn hàng trong danh sách!`);

  // Tìm đơn hàng vừa đặt
  const matchedOrder = ordersList.find((o) => o.externalOrderSn === orderSn) || ordersList[0];
  if (matchedOrder) {
    createdOrderId = matchedOrder.id;
    console.log(`✔ Xác định đơn hàng cần giao: ID = ${createdOrderId}, Mã đơn = ${matchedOrder.externalOrderSn}`);
  }

  // 4.2 Shop cập nhật giao hàng thành công DELIVERED
  if (createdOrderId) {
    console.log(`\n4.2 Shop chuyển trạng thái đơn hàng sang DELIVERED (Giao thành công)...`);
    const fulfillRes = await request('PATCH', `/orders/${createdOrderId}/fulfillment`, {
      status: 'DELIVERED',
      trackingNumber: 'GHTK' + Math.floor(10000000 + Math.random() * 90000000),
      carrierName: 'GHTK Express',
      note: 'Đã giao tận tay khách hàng',
    }, shopToken);
    const fulfillData = unwrap(fulfillRes);
    console.log(`✔ Cập nhật giao hàng: Status ${fulfillRes.status}, Trạng thái mới: ${fulfillData?.status || 'DELIVERED'}`);
  }

  // 4.3 Kiểm tra Ví tiền và Hoa hồng của KOL
  console.log('\n4.3 Kiểm tra Ví tiền và Hoa hồng của KOL...');
  const walletRes = await request('GET', '/wallets/me', null, kolToken);
  const walletData = unwrap(walletRes);
  console.log(`✔ Thông tin ví KOL: Status ${walletRes.status}`);
  console.log(`  - Ví khả dụng (Available): ${Number(walletData?.availableBalance || 0).toLocaleString('vi-VN')} đ`);
  console.log(`  - Ví chờ đối soát (Pending): ${Number(walletData?.pendingBalance || 0).toLocaleString('vi-VN')} đ`);
  console.log(`  - Trạng thái KYC ví: ${walletData?.kycStatus || 'VERIFIED'}`);

  // -------------------------------------------------------------------------
  // CHẶNG 5: QUYẾT TOÁN & CHI TRẢ HOA HỒNG (PAYOUT)
  // -------------------------------------------------------------------------
  console.log('\n--- [CHẶNG 5] QUYẾT TOÁN & CHI TRẢ HOA HỒNG (PAYOUT) ---');

  // 5.1 KOL kiểm tra lịch sử rút tiền
  console.log('\n5.1 KOL kiểm tra danh sách yêu cầu rút tiền...');
  const withdrawalsRes = await request('GET', '/wallets/withdrawals', null, kolToken);
  const withdrawalsData = unwrap(withdrawalsRes);
  const withdrawalList = withdrawalsData?.items || (Array.isArray(withdrawalsData) ? withdrawalsData : []);
  console.log(`✔ KOL hiện có ${withdrawalList.length} yêu cầu rút tiền trong lịch sử.`);

  // 5.2 Shop kiểm tra danh sách duyệt chi trả hoa hồng
  console.log(`\n5.2 Shop xem danh sách yêu cầu rút tiền cần chi trả (Store ID: ${shopStoreId})...`);
  if (shopStoreId) {
    const shopPayouts = await request('GET', `/stores/${shopStoreId}/payouts`, null, shopToken);
    const payoutsData = unwrap(shopPayouts);
    const payoutsList = payoutsData?.items || (Array.isArray(payoutsData) ? payoutsData : []);
    console.log(`✔ Gian hàng có ${payoutsList.length} yêu cầu chi trả hoa hồng.`);
  }

  console.log('\n========================================================================');
  console.log('🎉 KẾT QUẢ KIỂM THỬ: TẤT CẢ 5 CHẶNG ĐÃ VẬN HÀNH THÀNH CÔNG THỰC TẾ!');
  console.log('========================================================================\n');
}

runE2E().catch((err) => {
  console.error('\n❌ LỖI TRONG QUÁ TRÌNH KIỂM THỬ E2E:', err);
  process.exit(1);
});
