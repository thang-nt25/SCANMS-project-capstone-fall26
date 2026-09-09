// ==========================================================================
// SCANMS SHOP MANAGER OPERATIONS MODULE (Nghiệp Vụ Chủ Shop Mở Rộng)
// ==========================================================================

const icon = (name) => `<i class="ph ${name}" aria-hidden="true"></i>`;
const money = (v) => `${new Intl.NumberFormat("vi-VN").format(v)} ₫`;

export const shopOpsState = {
  sampleRequests: [
    {
      id: "SMP-101",
      kolName: "Trần Văn Nhật (nhatbeauty)",
      kolId: "KOL-R9K2N7",
      tier: "KOL Vàng (185K followers)",
      channel: "TikTok (@nhatbeauty)",
      productName: "Serum Vitamin C 15% Dưỡng Sáng Mờ Thâm Sora Skin",
      requestedAt: "07/09/2026 10:20",
      pitch: "Em làm video routine sáng 45s so sánh trước/sau 14 ngày, gắn giỏ hàng TikTok Shop và dẫn link affiliate.",
      shippingAddress: "Số 12 Nguyễn Văn Bảo, Phường 4, Gò Vấp, TP.HCM",
      status: "approved", // 'pending' | 'approved' | 'rejected' | 'delivered' | 'reviewed'
      waybillCode: "GHN-SMP-881290",
      reviewLink: "https://tiktok.com/@nhatbeauty/video/7391209381"
    },
    {
      id: "SMP-102",
      kolName: "Lê Cẩm Tú (tu.beauty)",
      kolId: "KOL-382",
      tier: "KOL Bạc (45K followers)",
      channel: "Instagram (@tucam.official)",
      productName: "Kem Chống Nắng SPF50+ Ultra Light",
      requestedAt: "08/09/2026 09:15",
      pitch: "Bộ ảnh Lookbook kết hợp Story swatch chất kem trên da dầu mụn.",
      shippingAddress: "Chung cư Sunrise City, Quận 7, TP.HCM",
      status: "pending",
      waybillCode: "",
      reviewLink: ""
    },
    {
      id: "SMP-103",
      kolName: "Nguyễn Hải Đăng (dangtech)",
      kolId: "KOL-112",
      tier: "KOL Đồng (5K followers)",
      channel: "TikTok (@dangtech)",
      productName: "Serum Vitamin C 15% Dưỡng Sáng Mờ Thâm Sora Skin",
      requestedAt: "06/09/2026 14:00",
      pitch: "Review ngắn 15 giây.",
      shippingAddress: "Hà Nội",
      status: "rejected",
      rejectReason: "Kênh chưa đúng tệp khách hàng mục tiêu của ngành hàng mỹ phẩm dưỡng da.",
      waybillCode: "",
      reviewLink: ""
    }
  ],

  mediaAssets: [
    { id: "MED-01", name: "Bộ Banner Khuyến Mãi Mùa Thu 1200x628", type: "image", linkedProduct: "Serum Vitamin C 15%", downloads: 480, status: "active", url: "./assets/serum-hero-optimized.jpg" },
    { id: "MED-02", name: "Video Hướng Dẫn Swatch Chất Serum 9:16", type: "video", linkedProduct: "Serum Vitamin C 15%", downloads: 890, status: "active", url: "./assets/sample-video.mp4" },
    { id: "MED-03", name: "Bảng Thành Phần & Giấy Công Bố Y Tế", type: "document", linkedProduct: "Serum Vitamin C 15%", downloads: 210, status: "active", url: "#" },
    { id: "MED-04", name: "Banner Siêu Sale 9.9 (Đã Hết Hạn)", type: "image", linkedProduct: "Kem Chống Nắng", downloads: 1200, status: "inactive", url: "./assets/serum-hero-optimized.jpg" }
  ],

  campaigns: [
    {
      id: "CMP-01",
      name: "Chiến Dịch Siêu Hoa Hồng Mùa Thu 2026",
      startDate: "01/09/2026",
      endDate: "30/09/2026",
      status: "running",
      rates: { bronze: 10, silver: 12, gold: 15, diamond: 18 },
      totalOrders: 640,
      gmv: 284000000
    },
    {
      id: "CMP-02",
      name: "Chính Sách Hoa Hồng Mặc Định Shop",
      startDate: "01/01/2026",
      endDate: "31/12/2026",
      status: "active",
      rates: { bronze: 8, silver: 10, gold: 12, diamond: 15 },
      totalOrders: 1820,
      gmv: 812000000
    }
  ],

  customerRequests: [
    {
      id: "REQ-301",
      orderId: "IN23944",
      customerName: "Nguyễn Hải Yến",
      type: "Đổi địa chỉ giao hàng",
      reason: "Em muốn đổi sang địa chỉ văn phòng vì mai công ty có mặt.",
      requestedAt: "08/09 15:30",
      status: "resolved",
      note: "Đã cập nhật địa chỉ mới với đơn vị vận chuyển GHN."
    },
    {
      id: "REQ-302",
      orderId: "IN23845",
      customerName: "Trần Bảo An",
      type: "Yêu cầu xuất hóa đơn VAT",
      reason: "Cần xuất VAT cho công ty TNHH Giải Pháp Số.",
      requestedAt: "08/09 11:00",
      status: "pending",
      note: "Chờ kế toán cửa hàng xuất e-invoice gửi email."
    }
  ]
};

// --------------------------------------------------------------------------
// 1. DUYỆT YÊU CẦU HÀNG MẪU (SHOP SAMPLES - MÀN HÌNH RIÊNG CHO SHOP)
// --------------------------------------------------------------------------
export function shopSamplesScreen() {
  return `
    <header class="page-head">
      <div>
        <div class="crumb"><span>Chủ Shop / </span><strong>Duyệt hàng mẫu</strong></div>
        <h1>Quản Lý Yêu Cầu Hàng Mẫu Từ KOL / CTV</h1>
        <p>Thẩm định hồ sơ KOL, phê duyệt gửi sản phẩm mẫu, cập nhật mã vận đơn và theo dõi bài review nghiệm thu.</p>
      </div>
      <div class="actions">
        <span class="badge" style="background:var(--brand-soft);color:var(--brand-strong);padding:8px 14px;font-weight:600">
          ${icon("ph-package")} Phân biệt rõ: Màn duyệt mẫu của Shop (không dùng màn xin mẫu của KOL)
        </span>
      </div>
    </header>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Mã / Ngày Gửi</th>
            <th>KOL / KOC Đề Xuất</th>
            <th>Sản Phẩm Yêu Cầu</th>
            <th>Kế Hoạch Nội Dung (Pitch)</th>
            <th>Địa Chỉ Nhận Hàng</th>
            <th>Trạng Thái & Vận Đơn</th>
            <th style="text-align:right">Thao Tác Duyệt</th>
          </tr>
        </thead>
        <tbody>
          ${shopOpsState.sampleRequests.map(smp => `
            <tr>
              <td>
                <strong class="mono">${smp.id}</strong>
                <div style="font-size:11px;color:var(--muted)">${smp.requestedAt}</div>
              </td>
              <td>
                <strong style="color:var(--text)">${smp.kolName}</strong>
                <div style="font-size:11.5px;color:var(--brand);font-weight:600">${smp.tier}</div>
                <div style="font-size:11px;color:var(--muted)">${smp.channel}</div>
              </td>
              <td style="font-weight:600;font-size:13px">${smp.productName}</td>
              <td style="max-width:280px;font-size:12px;line-height:1.4">${smp.pitch}</td>
              <td style="font-size:12px;color:var(--muted);max-width:200px">${smp.shippingAddress}</td>
              <td>
                ${smp.status === 'approved' ? `
                  <span class="badge success" style="font-size:11px"><i class="ph ph-check"></i> Đã duyệt gửi mẫu</span>
                  <div class="mono" style="font-size:11px;color:var(--muted);margin-top:2px">Vận đơn: ${smp.waybillCode}</div>
                ` : (smp.status === 'pending' ? `
                  <span class="badge warning" style="font-size:11px"><i class="ph ph-clock"></i> Chờ duyệt</span>
                ` : `
                  <span class="badge danger" style="font-size:11px"><i class="ph ph-x"></i> Từ chối</span>
                  <div style="font-size:11px;color:#dc2626;margin-top:2px">${smp.rejectReason}</div>
                `)}
              </td>
              <td style="text-align:right">
                <div class="actions" style="justify-content:flex-end">
                  ${smp.status === 'pending' ? `
                    <button class="btn small" data-shop-approve-sample="${smp.id}" style="background:#059669;color:#fff"><i class="ph ph-check"></i> Duyệt</button>
                    <button class="btn small danger" data-shop-reject-sample="${smp.id}"><i class="ph ph-x"></i> Từ chối</button>
                  ` : ''}
                  ${smp.waybillCode ? `
                    <button class="btn small secondary" data-shop-view-waybill="${smp.waybillCode}"><i class="ph ph-truck"></i> Vận đơn</button>
                  ` : ''}
                  ${smp.reviewLink ? `
                    <a href="${smp.reviewLink}" target="_blank" class="btn small secondary" style="text-decoration:none"><i class="ph ph-video"></i> Xem Review</a>
                  ` : ''}
                </div>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

// --------------------------------------------------------------------------
// 2. QUẢN LÝ TÀI NGUYÊN TRUYỀN THÔNG (SHOP MEDIA)
// --------------------------------------------------------------------------
export function shopMediaScreen() {
  return `
    <header class="page-head">
      <div>
        <div class="crumb"><span>Chủ Shop / </span><strong>Tài nguyên truyền thông</strong></div>
        <h1>Kho Tài Nguyên & Media Cửa Hàng</h1>
        <p>Tải lên banner, video hướng dẫn và tài liệu chứng nhận để cung cấp cho đội ngũ CTV sáng tạo nội dung.</p>
      </div>
      <div class="actions">
        <button class="btn" data-shop-upload-media><i class="ph ph-upload-simple"></i> Tải lên tài nguyên mới</button>
      </div>
    </header>

    <div class="grid" style="grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:16px">
      ${shopOpsState.mediaAssets.map(asset => `
        <div class="card" style="padding:16px;display:flex;flex-direction:column;justify-content:space-between">
          <div>
            <div style="width:100%;height:140px;background:var(--surface-2);border-radius:8px;overflow:hidden;display:grid;place-items:center;margin-bottom:12px">
              ${asset.type === 'video' ? `<i class="ph ph-video" style="font-size:48px;color:var(--brand)"></i>` : 
                (asset.type === 'image' ? `<img src="${asset.url}" style="width:100%;height:100%;object-fit:cover" />` : 
                `<i class="ph ph-file-text" style="font-size:48px;color:#dc2626"></i>`)}
            </div>
            <span class="badge neutral" style="font-size:11px">${asset.type.toUpperCase()}</span>
            <strong style="font-size:14px;display:block;margin:6px 0 4px;line-height:1.4">${asset.name}</strong>
            <small style="color:var(--muted)">Gắn sản phẩm: <strong>${asset.linkedProduct}</strong></small>
            <div style="font-size:12px;color:var(--muted);margin-top:6px">${icon("ph-download-simple")} ${asset.downloads} lượt CTV tải về</div>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid var(--line);margin-top:14px">
            <span class="badge ${asset.status === 'active' ? 'success' : 'neutral'}" style="font-size:11px">
              ${asset.status === 'active' ? 'Đang khả dụng' : 'Đã ngừng dùng'}
            </span>
            <div style="display:flex;gap:6px">
              <button class="icon-btn" data-shop-toggle-media="${asset.id}" title="Bật/Tắt sử dụng">${icon("ph-power")}</button>
              <button class="icon-btn danger" data-shop-delete-media="${asset.id}" title="Xóa tài nguyên">${icon("ph-trash")}</button>
            </div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

// --------------------------------------------------------------------------
// 3. CHIẾN DỊCH & HOA HỒNG BẬC THANG (SHOP CAMPAIGNS)
// --------------------------------------------------------------------------
export function shopCampaignsScreen() {
  return `
    <header class="page-head">
      <div>
        <div class="crumb"><span>Chủ Shop / </span><strong>Chiến dịch & Hoa hồng</strong></div>
        <h1>Chiến Dịch Tiếp Thị & Chính Sách Hoa Hồng</h1>
        <p>Thiết lập tỷ lệ hoa hồng bậc thang theo từng cấp bậc CTV và quản lý thời hạn hiệu lực của chiến dịch.</p>
      </div>
      <div class="actions">
        <button class="btn" data-shop-create-campaign><i class="ph ph-plus"></i> Tạo chiến dịch mới</button>
      </div>
    </header>

    <div style="display:flex;flex-direction:column;gap:18px">
      ${shopOpsState.campaigns.map(cmp => `
        <div class="card" style="padding:22px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;border-bottom:1px solid var(--line);margin-bottom:16px">
            <div>
              <strong style="font-size:17px">${cmp.name}</strong>
              <div style="font-size:12px;color:var(--muted);margin-top:4px">
                Thời gian hiệu lực: <strong>${cmp.startDate}</strong> &rarr; <strong>${cmp.endDate}</strong>
              </div>
            </div>
            <span class="badge ${cmp.status === 'running' ? 'success' : 'neutral'}" style="font-weight:700">
              ${cmp.status === 'running' ? 'ĐANG CHẠY' : 'HOẠT ĐỘNG'}
            </span>
          </div>

          <!-- Bảng Tỷ Lệ Hoa Hồng Bậc Thang -->
          <div class="grid" style="grid-template-columns:repeat(4, 1fr);gap:12px;margin-bottom:16px">
            <div style="padding:12px;background:var(--surface-2);border-radius:8px;text-align:center">
              <small style="color:var(--muted)">Cấp Đồng (Cơ bản)</small>
              <strong style="font-size:20px;display:block;margin-top:4px;color:var(--text)">${cmp.rates.bronze}%</strong>
            </div>
            <div style="padding:12px;background:var(--surface-2);border-radius:8px;text-align:center">
              <small style="color:var(--muted)">Cấp Bạc</small>
              <strong style="font-size:20px;display:block;margin-top:4px;color:var(--text)">${cmp.rates.silver}%</strong>
            </div>
            <div style="padding:12px;background:var(--surface-2);border-radius:8px;text-align:center">
              <small style="color:var(--muted)">Cấp Vàng</small>
              <strong style="font-size:20px;display:block;margin-top:4px;color:var(--brand)">${cmp.rates.gold}%</strong>
            </div>
            <div style="padding:12px;background:var(--surface-2);border-radius:8px;text-align:center">
              <small style="color:var(--muted)">Cấp Kim Cương</small>
              <strong style="font-size:20px;display:block;margin-top:4px;color:#059669">${cmp.rates.diamond}%</strong>
            </div>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid var(--line);font-size:13px">
            <div>
              Hiệu suất: <strong>${cmp.totalOrders} đơn hàng</strong> • Doanh thu GMV: <strong style="color:var(--brand)">${money(cmp.gmv)}</strong>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn small secondary" data-shop-edit-campaign="${cmp.id}"><i class="ph ph-pencil"></i> Chỉnh sửa</button>
            </div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

// --------------------------------------------------------------------------
// 4. XỬ LÝ ĐƠN KHÁCH MUA & HỖ TRỢ (SHOP CUSTOMER REQUESTS)
// --------------------------------------------------------------------------
export function shopCustomerRequestsScreen() {
  return `
    <header class="page-head">
      <div>
        <div class="crumb"><span>Chủ Shop / </span><strong>Yêu cầu khách mua</strong></div>
        <h1>Xử Lý Yêu Cầu Đổi Trả & Khiếu Nại Từ Khách Hàng</h1>
        <p>Tiếp nhận và giải quyết trực tiếp các yêu cầu hủy đơn, đổi trả hàng và hỗ trợ thông tin từ Customer.</p>
      </div>
    </header>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Mã Yêu Cầu</th>
            <th>Mã Đơn Hàng</th>
            <th>Tên Khách Hàng</th>
            <th>Loại Yêu Cầu</th>
            <th>Lý Do / Nội Dung</th>
            <th>Thời Gian</th>
            <th>Trạng Thái</th>
            <th style="text-align:right">Thao Tác</th>
          </tr>
        </thead>
        <tbody>
          ${shopOpsState.customerRequests.map(req => `
            <tr>
              <td class="mono" style="font-weight:600">${req.id}</td>
              <td class="mono"><strong>${req.orderId}</strong></td>
              <td>${req.customerName}</td>
              <td><span class="badge neutral">${req.type}</span></td>
              <td style="max-width:260px;font-size:12.5px">${req.reason}</td>
              <td style="font-size:12px;color:var(--muted)">${req.requestedAt}</td>
              <td>
                ${req.status === 'resolved' ? '<span class="badge success">Đã giải quyết</span>' : '<span class="badge warning">Đang chờ xử lý</span>'}
              </td>
              <td style="text-align:right">
                <button class="btn small ${req.status === 'pending' ? '' : 'secondary'}" data-shop-handle-cust-req="${req.id}">
                  ${req.status === 'pending' ? 'Xử lý ngay' : 'Xem ghi chú'}
                </button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

// --------------------------------------------------------------------------
// 5. CÀI ĐẶT SHOP (SHOP SETTINGS)
// --------------------------------------------------------------------------
export function shopSettingsScreen() {
  return `
    <header class="page-head">
      <div>
        <div class="crumb"><span>Chủ Shop / </span><strong>Cài đặt gian hàng</strong></div>
        <h1>Cài Đặt Cửa Hàng & Quy Tắc Đối Soát</h1>
        <p>Thông tin pháp lý doanh nghiệp, tài khoản ngân hàng thụ hưởng và lịch duyệt chi trả hoa hồng tự động.</p>
      </div>
      <div class="actions">
        <button class="btn" data-shop-save-settings><i class="ph ph-check"></i> Lưu cài đặt</button>
      </div>
    </header>

    <div class="split" style="grid-template-columns:1fr 1fr;gap:20px">
      <div class="card" style="padding:22px">
        <h3 style="margin-top:0;font-size:16px;border-bottom:1px solid var(--line);padding-bottom:10px">${icon("ph-storefront")} Thông tin cửa hàng</h3>
        <div class="form-stack" style="margin-top:16px">
          <div class="field"><label>Tên gian hàng</label><input class="input" value="Sora Skin Official" /></div>
          <div class="field"><label>Mã số thuế doanh nghiệp</label><input class="input mono" value="0109823456" disabled /></div>
          <div class="field"><label>Địa chỉ kho xuất hàng</label><input class="input" value="Kho A3, Khu Công Nghiệp Tân Bình, TP.HCM" /></div>
          <div class="field"><label>Hotline CSKH</label><input class="input" value="1900 6868" /></div>
        </div>
      </div>

      <div class="card" style="padding:22px">
        <h3 style="margin-top:0;font-size:16px;border-bottom:1px solid var(--line);padding-bottom:10px">${icon("ph-bank")} Tài khoản ngân hàng đối soát & Chi trả</h3>
        <div class="form-stack" style="margin-top:16px">
          <div class="field"><label>Ngân hàng thụ hưởng</label><select class="select"><option selected>Vietcombank (VCB) - Chi nhánh TP.HCM</option></select></div>
          <div class="field"><label>Số tài khoản</label><input class="input mono" value="0071001234567" /></div>
          <div class="field"><label>Tên chủ tài khoản</label><input class="input" value="CTY TNHH SORA SKIN VIETNAM" disabled /></div>
          <div class="field">
            <label>Lịch đối soát & Duyệt chi trả</label>
            <select class="select">
              <option selected>Định kỳ vào ngày 10 & 25 hàng tháng</option>
              <option>Duyệt hàng tuần vào thứ Hai</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  `;
}

// --------------------------------------------------------------------------
// BINDING LOGIC CHO SHOP OPERATIONS
// --------------------------------------------------------------------------
export function bindShopOps(root, { toast, go, renderCurrentPage }) {
  // Approve sample
  root.querySelectorAll("[data-shop-approve-sample]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.shopApproveSample;
      const smp = shopOpsState.sampleRequests.find(s => s.id === id);
      if (!smp) return;
      const waybill = prompt(`Nhập mã vận đơn gửi hàng mẫu cho KOL "${smp.kolName}":`, "GHN-SMP-" + Date.now().toString().slice(-6));
      if (waybill) {
        smp.status = "approved";
        smp.waybillCode = waybill;
        toast(`Đã duyệt yêu cầu hàng mẫu ${id} và gắn mã vận đơn ${waybill}!`);
        renderCurrentPage();
      }
    });
  });

  // Reject sample
  root.querySelectorAll("[data-shop-reject-sample]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.shopRejectSample;
      const smp = shopOpsState.sampleRequests.find(s => s.id === id);
      if (!smp) return;
      const reason = prompt("Nhập lý do từ chối gửi mẫu:", "Tạm thời hết mẫu thử dung tích 30ml trong kho.");
      if (reason) {
        smp.status = "rejected";
        smp.rejectReason = reason;
        toast(`Đã từ chối yêu cầu hàng mẫu ${id}.`);
        renderCurrentPage();
      }
    });
  });

  // View waybill
  root.querySelectorAll("[data-shop-view-waybill]").forEach(btn => {
    btn.addEventListener("click", () => {
      toast(`Tra cứu vận đơn: ${btn.dataset.shopViewWaybill} (Đang vận chuyển qua GHN)`);
    });
  });

  // Toggle media
  root.querySelectorAll("[data-shop-toggle-media]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.shopToggleMedia;
      const m = shopOpsState.mediaAssets.find(a => a.id === id);
      if (!m) return;
      m.status = (m.status === "active" ? "inactive" : "active");
      toast(`Đã ${m.status === "active" ? "kích hoạt" : "ngừng dùng"} tài nguyên ${m.name}!`);
      renderCurrentPage();
    });
  });

  // Delete media
  root.querySelectorAll("[data-shop-delete-media]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.shopDeleteMedia;
      shopOpsState.mediaAssets = shopOpsState.mediaAssets.filter(a => a.id !== id);
      toast("Đã xóa tài nguyên khỏi kho truyền thông!");
      renderCurrentPage();
    });
  });

  // Upload media demo
  root.querySelector("[data-shop-upload-media]")?.addEventListener("click", () => {
    const name = prompt("Nhập tên tài nguyên media mới:", "Banner Siêu Ưu Đãi Tháng 10 1200x628");
    if (name) {
      shopOpsState.mediaAssets.unshift({
        id: `MED-${Date.now().toString().slice(-2)}`,
        name: name,
        type: "image",
        linkedProduct: "Serum Vitamin C 15%",
        downloads: 0,
        status: "active",
        url: "./assets/serum-hero-optimized.jpg"
      });
      toast("Đã tải lên và gắn tài nguyên vào sản phẩm thành công!");
      renderCurrentPage();
    }
  });

  // Create Campaign demo
  root.querySelector("[data-shop-create-campaign]")?.addEventListener("click", () => {
    const name = prompt("Nhập tên chiến dịch hoa hồng mới:", "Flash Sale 10.10 Tiếp Thị Đỉnh Cao");
    if (name) {
      shopOpsState.campaigns.unshift({
        id: `CMP-${Date.now().toString().slice(-2)}`,
        name: name,
        startDate: "10/10/2026",
        endDate: "15/10/2026",
        status: "running",
        rates: { bronze: 12, silver: 15, gold: 18, diamond: 22 },
        totalOrders: 0,
        gmv: 0
      });
      toast(`Đã tạo thành công chiến dịch ${name}!`);
      renderCurrentPage();
    }
  });

  // Handle Cust Req
  root.querySelectorAll("[data-shop-handle-cust-req]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.shopHandleCustReq;
      const req = shopOpsState.customerRequests.find(r => r.id === id);
      if (!req) return;
      if (req.status === "pending") {
        const note = prompt(`Nhập hướng xử lý cho yêu cầu ${req.id}:`, "Đã xuất hóa đơn điện tử gửi về email khách hàng.");
        if (note) {
          req.status = "resolved";
          req.note = note;
          toast(`Đã xử lý xong yêu cầu ${req.id} của khách!`);
          renderCurrentPage();
        }
      } else {
        toast(`Ghi chú giải quyết: ${req.note}`);
      }
    });
  });

  // Save shop settings
  root.querySelector("[data-shop-save-settings]")?.addEventListener("click", () => {
    toast("Đã lưu thông tin cài đặt cửa hàng và tài khoản đối soát thành công!");
  });
}
