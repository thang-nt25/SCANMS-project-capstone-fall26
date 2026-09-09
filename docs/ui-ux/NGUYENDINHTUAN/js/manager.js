// ==========================================================================
// SCANMS SYSTEM MANAGER MODULE (Vận Hành Nền Tảng)
// ==========================================================================

const icon = (name) => `<i class="ph ${name}" aria-hidden="true"></i>`;
const money = (v) => `${new Intl.NumberFormat("vi-VN").format(v)} ₫`;

export const managerState = {
  stores: [
    {
      id: "STORE-001",
      name: "Sora Skin Official",
      owner: "Nguyễn Thu Hà",
      email: "shop@scanms.vn",
      phone: "0912 345 678",
      taxCode: "0109823456",
      category: "Mỹ phẩm & Chăm sóc da",
      submittedAt: "05/09/2026 14:30",
      status: "approved", // 'pending' | 'reviewing' | 'approved' | 'need_info' | 'rejected'
      productsCount: 24,
      kolCount: 156,
      gmv: 428000000,
      notes: "Hồ sơ pháp lý đầy đủ GPKD và công bố mỹ phẩm chuẩn Bộ Y Tế.",
      rejectionReason: "",
      documents: ["GPKD_SoraSkin_2026.pdf", "CongBoMyPham_15C.pdf", "HopDong_DaiLy.pdf"]
    },
    {
      id: "STORE-002",
      name: "Gia Dụng Thông Minh ZenHome",
      owner: "Phạm Quốc Hưng",
      email: "contact@zenhome.vn",
      phone: "0988 776 655",
      taxCode: "0312456789",
      category: "Gia dụng & Đời sống",
      submittedAt: "07/09/2026 09:15",
      status: "reviewing",
      productsCount: 18,
      kolCount: 42,
      gmv: 165000000,
      notes: "Đang kiểm tra đối chiếu tài khoản ngân hàng thụ hưởng và hóa đơn đầu vào.",
      rejectionReason: "",
      documents: ["GPKD_ZenHome.pdf", "GiayUyQuyenThuongHieu.pdf"]
    },
    {
      id: "STORE-003",
      name: "Thời Trang Thiết Kế Aura Studio",
      owner: "Lê Cẩm Tú",
      email: "aura.studio@gmail.com",
      phone: "0909 112 233",
      taxCode: "0107654321",
      category: "Thời trang & Phụ kiện",
      submittedAt: "08/09/2026 11:20",
      status: "pending",
      productsCount: 35,
      kolCount: 0,
      gmv: 0,
      notes: "Cửa hàng mới nộp hồ sơ. Chờ chuyên viên vận hành tiếp nhận thẩm định.",
      rejectionReason: "",
      documents: ["GPKD_AuraStudio.pdf"]
    },
    {
      id: "STORE-004",
      name: "Thực Phẩm Xanh EcoMart",
      owner: "Trần Minh Đạt",
      email: "ecomart.vn@gmail.com",
      phone: "0934 567 890",
      taxCode: "0319876543",
      category: "Thực phẩm & Sức khỏe",
      submittedAt: "06/09/2026 16:45",
      status: "need_info",
      productsCount: 12,
      kolCount: 0,
      gmv: 0,
      notes: "Thiếu giấy chứng nhận Vệ sinh an toàn thực phẩm (VSATTP) cho mặt hàng hạt dinh dưỡng.",
      rejectionReason: "",
      documents: ["GPKD_EcoMart.pdf"]
    },
    {
      id: "STORE-005",
      name: "Phụ Kiện Công Nghệ TechVolt",
      owner: "Hoàng Nam",
      email: "techvolt@outlook.com",
      phone: "0945 678 123",
      taxCode: "0105558889",
      category: "Công nghệ & Điện tử",
      submittedAt: "04/09/2026 10:00",
      status: "rejected",
      productsCount: 0,
      kolCount: 0,
      gmv: 0,
      notes: "Từ chối do sản phẩm không có giấy chứng nhận hợp quy ICT theo quy định.",
      rejectionReason: "Sản phẩm sạc dự phòng không cung cấp được chứng nhận hợp quy ICT & hồ sơ xuất xứ CO/CQ.",
      documents: ["GPKD_TechVolt.pdf"]
    }
  ],

  banks: [
    { id: "VCB", code: "970436", name: "Vietcombank", shortName: "VCB", logo: "ph-bank", active: true, transferTime: "Tức thì (24/7)", sandboxLabel: "Sandbox Simulator", totalPayouts: "1.240 đơn" },
    { id: "MB", code: "970422", name: "MB Bank (Ngân hàng Quân Đội)", shortName: "MB", logo: "ph-bank", active: true, transferTime: "Tức thì (24/7)", sandboxLabel: "Sandbox Simulator", totalPayouts: "890 đơn" },
    { id: "TCB", code: "970407", name: "Techcombank", shortName: "TCB", logo: "ph-bank", active: true, transferTime: "Tức thì (24/7)", sandboxLabel: "Sandbox Simulator", totalPayouts: "720 đơn" },
    { id: "ACB", code: "970416", name: "ACB (Ngân hàng Á Châu)", shortName: "ACB", logo: "ph-bank", active: true, transferTime: "Tức thì (24/7)", sandboxLabel: "Sandbox Simulator", totalPayouts: "430 đơn" },
    { id: "VPB", code: "970432", name: "VPBank", shortName: "VPB", logo: "ph-bank", active: false, transferTime: "Tạm dừng bảo trì cổng", sandboxLabel: "Sandbox Simulator", totalPayouts: "210 đơn" }
  ],

  fraudAlerts: [
    {
      id: "FRD-901",
      kolName: "Hoàng Đức (hoangduc.review)",
      kolId: "KOL-782",
      riskLevel: "high", // 'high' | 'medium' | 'low'
      score: 94,
      reason: "Bất thường tần suất click (Velocity Spike): 1.420 clicks trong 2 phút từ cùng dải IP proxy.",
      detectedAt: "08/09/2026 15:24",
      ipAddress: "14.241.88.19 (VNPT Proxy)",
      targetStore: "Sora Skin Official",
      status: "pending", // 'pending' | 'processing' | 'resolved_fraud' | 'false_positive' | 'escalated'
      handledBy: "",
      resolutionNote: ""
    },
    {
      id: "FRD-902",
      kolName: "Mai Linh (linhmai.deals)",
      kolId: "KOL-419",
      riskLevel: "medium",
      score: 68,
      reason: "Trùng khớp dấu vân tay thiết bị (Device Fingerprint) giữa tài khoản mua hàng và tài khoản tạo link tiếp thị.",
      detectedAt: "08/09/2026 11:10",
      ipAddress: "113.161.45.88",
      targetStore: "Gia Dụng ZenHome",
      status: "processing",
      handledBy: "Lê Hồng Phúc (Vận Hành Sàn)",
      resolutionNote: "Đang yêu cầu Shop xác minh đối chiếu địa chỉ nhận hàng và họ tên người mua."
    },
    {
      id: "FRD-903",
      kolName: "Phương Anh (panh.beauty)",
      kolId: "KOL-155",
      riskLevel: "low",
      score: 42,
      reason: "Tỷ lệ chuyển đổi đơn hàng tăng đột biến trong khung giờ 02:00 - 04:00 sáng.",
      detectedAt: "07/09/2026 22:40",
      ipAddress: "27.72.102.15",
      targetStore: "Sora Skin Official",
      status: "false_positive",
      handledBy: "Lê Hồng Phúc (Vận Hành Sàn)",
      resolutionNote: "Xác minh hợp lệ: KOL đang chạy buổi livestream đêm muộn có 12.000 người xem đồng thời."
    }
  ],

  opsLogs: [
    { id: "LOG-01", time: "08/09 15:30", actor: "Lê Hồng Phúc (Vận Hành Sàn)", action: "TIẾP NHẬN XỬ LÝ", target: "FRD-901 (KOL-782)", note: "Tiếp nhận cảnh báo click bất thường để phân tích log truy cập." },
    { id: "LOG-02", time: "08/09 14:15", actor: "Lê Hồng Phúc (Vận Hành Sàn)", action: "YÊU CẦU BỔ SUNG", target: "STORE-004 (EcoMart)", note: "Yêu cầu bổ sung Giấy chứng nhận VSATTP." },
    { id: "LOG-03", time: "07/09 18:20", actor: "Lê Hồng Phúc (Vận Hành Sàn)", action: "DUYỆT HỒ SƠ", target: "STORE-001 (Sora Skin)", note: "Phê duyệt kích hoạt gian hàng đối tác Enterprise." },
    { id: "LOG-04", time: "07/09 10:00", actor: "Lê Hồng Phúc (Vận Hành Sàn)", action: "KẾT LUẬN HỢP LỆ", target: "FRD-903 (KOL-155)", note: "Ghi nhận Livestream đêm là đơn hàng thực tế." }
  ],

  activeStoreFilter: "all",
  activeFraudFilter: "all",
  selectedStoreDetailId: null
};

// --------------------------------------------------------------------------
// 1. TỔNG QUAN VẬN HÀNH (MANAGER DASHBOARD)
// --------------------------------------------------------------------------
export function managerDashboardScreen() {
  const pendingStores = managerState.stores.filter(s => s.status === "pending" || s.status === "reviewing").length;
  const needInfoStores = managerState.stores.filter(s => s.status === "need_info").length;
  const pendingFrauds = managerState.fraudAlerts.filter(f => f.status === "pending" || f.status === "processing").length;
  const activeBanks = managerState.banks.filter(b => b.active).length;

  return `
    <header class="page-head">
      <div>
        <div class="crumb"><span>Vận hành nền tảng / </span><strong>Tổng quan vận hành</strong></div>
        <h1>Trung Tâm Vận Hành Sàn (Platform Operations)</h1>
        <p>Giám sát tiến độ xét duyệt gian hàng Shop, điều phối danh mục ngân hàng hỗ trợ và xử lý cảnh báo gian lận thời gian thực.</p>
      </div>
      <div class="actions">
        <span class="badge" style="background:var(--brand-soft);color:var(--brand-strong);padding:8px 14px;border-radius:10px;font-weight:600">
          ${icon("ph-shield-check")} Quyền hạn: Vận Hành Sàn
        </span>
      </div>
    </header>

    <!-- 4 Khối Chỉ Số Vận Hành Cốt Lõi (Clickable chuyển nhanh) -->
    <div class="grid kpis" style="grid-template-columns:repeat(4, 1fr);gap:16px;margin-bottom:24px">
      <div class="card kpi-card clickable" data-mgr-goto="manager-stores" data-mgr-filter="pending" style="cursor:pointer;transition:transform .18s ease" title="Bấm để xem danh sách Shop chờ duyệt">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <small style="color:var(--muted);font-weight:600">Shop Chờ Xét Duyệt</small>
          <span style="background:#fef3c7;color:#d97706;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;font-size:18px">${icon("ph-hourglass-high")}</span>
        </div>
        <strong style="font-size:30px;display:block;margin:8px 0 4px;color:#d97706">${pendingStores}</strong>
        <span style="font-size:12px;color:var(--muted)">Cần xử lý thẩm định trong 24h &rarr;</span>
      </div>

      <div class="card kpi-card clickable" data-mgr-goto="manager-stores" data-mgr-filter="need_info" style="cursor:pointer;transition:transform .18s ease" title="Bấm để xem danh sách Shop cần bổ sung">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <small style="color:var(--muted);font-weight:600">Hồ Sơ Cần Bổ Sung</small>
          <span style="background:#e0e7ff;color:#4f46e5;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;font-size:18px">${icon("ph-file-arrow-up")}</span>
        </div>
        <strong style="font-size:30px;display:block;margin:8px 0 4px;color:#4f46e5">${needInfoStores}</strong>
        <span style="font-size:12px;color:var(--muted)">Đang chờ Shop nộp lại tài liệu &rarr;</span>
      </div>

      <div class="card kpi-card clickable" data-mgr-goto="manager-fraud" data-mgr-filter="pending" style="cursor:pointer;transition:transform .18s ease" title="Bấm để xem cảnh báo gian lận">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <small style="color:var(--muted);font-weight:600">Cảnh Báo Gian Lận Chưa Xử Lý</small>
          <span style="background:#fee2e2;color:#dc2626;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;font-size:18px">${icon("ph-warning-octagon")}</span>
        </div>
        <strong style="font-size:30px;display:block;margin:8px 0 4px;color:#dc2626">${pendingFrauds}</strong>
        <span style="font-size:12px;color:var(--muted)">AI Sentinel phát hiện rủi ro &rarr;</span>
      </div>

      <div class="card kpi-card clickable" data-mgr-goto="manager-banks" style="cursor:pointer;transition:transform .18s ease" title="Bấm để quản lý danh mục ngân hàng">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <small style="color:var(--muted);font-weight:600">Ngân Hàng Hoạt Động</small>
          <span style="background:#d1fae5;color:#059669;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;font-size:18px">${icon("ph-bank")}</span>
        </div>
        <strong style="font-size:30px;display:block;margin:8px 0 4px;color:#059669">${activeBanks} / ${managerState.banks.length}</strong>
        <span style="font-size:12px;color:var(--muted)">Hạ tầng VietQR / Napas (Sandbox) &rarr;</span>
      </div>
    </div>

    <!-- Hàng Nội dung: Bảng Hồ Sơ Mới Nhất & Cảnh Báo Gần Nhất -->
    <div class="split" style="grid-template-columns:1.2fr 0.8fr;gap:20px;align-items:start">
      <div class="card" style="padding:20px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <div>
            <h3 style="margin:0;font-size:16px">${icon("ph-buildings")} Hồ sơ Shop cần xử lý gấp</h3>
            <small style="color:var(--muted)">Tuân thủ quy trình thẩm định 4 bước không bỏ qua kiểm tra pháp lý</small>
          </div>
          <button class="btn small secondary" data-mgr-goto="manager-stores">Xem tất cả</button>
        </div>
        <div class="table-wrap" style="border:none">
          <table style="width:100%">
            <thead>
              <tr>
                <th>Tên Gian Hàng</th>
                <th>Chủ Sở Hữu</th>
                <th>Thời Gian Gửi</th>
                <th>Trạng Thái</th>
                <th style="text-align:right">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              ${managerState.stores.slice(0, 4).map(st => `
                <tr>
                  <td>
                    <strong>${st.name}</strong>
                    <div style="font-size:11px;color:var(--muted)">${st.category}</div>
                  </td>
                  <td>${st.owner}</td>
                  <td style="font-size:12px;color:var(--muted)">${st.submittedAt}</td>
                  <td>${renderStoreStatusBadge(st.status)}</td>
                  <td style="text-align:right">
                    <button class="btn small" data-mgr-view-store="${st.id}" style="padding:4px 10px;font-size:12px">Thẩm định</button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card" style="padding:20px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <div>
            <h3 style="margin:0;font-size:16px">${icon("ph-shield-warning")} Cảnh báo gian lận mới</h3>
            <small style="color:var(--muted)">AI Sentinel gắn cờ tự động</small>
          </div>
          <button class="btn small secondary" data-mgr-goto="manager-fraud">Xem tất cả</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px">
          ${managerState.fraudAlerts.map(fa => `
            <div style="padding:12px;border:1px solid var(--line);border-radius:10px;background:var(--surface-2)">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <span class="badge ${fa.riskLevel === 'high' ? 'danger' : (fa.riskLevel === 'medium' ? 'warning' : 'neutral')}" style="font-size:11px;font-weight:700">
                  RỦI RO ${fa.riskLevel.toUpperCase()} • ${fa.score}đ
                </span>
                <span style="font-size:11.5px;color:var(--muted)">${fa.detectedAt}</span>
              </div>
              <strong style="font-size:13px;display:block;margin-bottom:4px">${fa.kolName}</strong>
              <p style="font-size:12px;color:var(--muted);margin:0 0 8px;line-height:1.4">${fa.reason}</p>
              <div style="display:flex;justify-content:space-between;align-items:center">
                <small style="color:var(--muted)">Mục tiêu: <strong>${fa.targetStore}</strong></small>
                <button class="text-btn" data-mgr-handle-fraud="${fa.id}" style="font-size:12px;font-weight:600">Xử lý ngay &rarr;</button>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

// Helper render status badge
function renderStoreStatusBadge(status) {
  switch (status) {
    case "approved":
      return `<span class="badge success" style="background:#d1fae5;color:#059669;padding:3px 8px;border-radius:6px;font-size:11.5px;font-weight:600"><i class="ph ph-check-circle"></i> Đã được duyệt</span>`;
    case "reviewing":
      return `<span class="badge info" style="background:#e0e7ff;color:#4f46e5;padding:3px 8px;border-radius:6px;font-size:11.5px;font-weight:600"><i class="ph ph-hourglass"></i> Đang xem xét</span>`;
    case "pending":
      return `<span class="badge warning" style="background:#fef3c7;color:#d97706;padding:3px 8px;border-radius:6px;font-size:11.5px;font-weight:600"><i class="ph ph-clock"></i> Chờ xét duyệt</span>`;
    case "need_info":
      return `<span class="badge warning" style="background:#fed7aa;color:#c2410c;padding:3px 8px;border-radius:6px;font-size:11.5px;font-weight:600"><i class="ph ph-file-arrow-up"></i> Cần bổ sung</span>`;
    case "rejected":
      return `<span class="badge danger" style="background:#fee2e2;color:#dc2626;padding:3px 8px;border-radius:6px;font-size:11.5px;font-weight:600"><i class="ph ph-x-circle"></i> Bị từ chối</span>`;
    default:
      return `<span class="badge neutral">${status}</span>`;
  }
}

// --------------------------------------------------------------------------
// 2. HỒ SƠ & XÉT DUYỆT SHOP (MANAGER STORES)
// --------------------------------------------------------------------------
export function managerStoresScreen() {
  const filter = managerState.activeStoreFilter;
  const filtered = managerState.stores.filter(s => {
    if (filter === "all") return true;
    if (filter === "pending") return s.status === "pending" || s.status === "reviewing";
    return s.status === filter;
  });

  return `
    <header class="page-head">
      <div>
        <div class="crumb"><span>Vận hành / </span><strong>Hồ sơ Cửa hàng (Shop)</strong></div>
        <h1>Thẩm Định & Xét Duyệt Gian Hàng Shop</h1>
        <p>Quy trình thẩm định pháp lý 4 trạng thái chuẩn: Chờ xét duyệt &rarr; Đang xem xét &rarr; Được duyệt / Cần bổ sung / Bị từ chối.</p>
      </div>
      <div class="actions">
        <button class="btn secondary" data-mgr-toast="Đã xuất danh sách hồ sơ Shop"><i class="ph ph-download-simple"></i> Xuất Excel</button>
      </div>
    </header>

    <!-- Bộ Lọc Trạng Thái Pipeline Chuẩn -->
    <div class="toolbar" style="margin-bottom:18px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
      <div class="segmented" style="margin:0">
        <button class="${filter === 'all' ? 'active' : ''}" data-mgr-store-filter="all">Tất cả (${managerState.stores.length})</button>
        <button class="${filter === 'pending' ? 'active' : ''}" data-mgr-store-filter="pending">Chờ & Đang duyệt (${managerState.stores.filter(s => s.status === 'pending' || s.status === 'reviewing').length})</button>
        <button class="${filter === 'need_info' ? 'active' : ''}" data-mgr-store-filter="need_info">Cần bổ sung (${managerState.stores.filter(s => s.status === 'need_info').length})</button>
        <button class="${filter === 'approved' ? 'active' : ''}" data-mgr-store-filter="approved">Đã duyệt (${managerState.stores.filter(s => s.status === 'approved').length})</button>
        <button class="${filter === 'rejected' ? 'active' : ''}" data-mgr-store-filter="rejected">Bị từ chối (${managerState.stores.filter(s => s.status === 'rejected').length})</button>
      </div>
      <div style="display:flex;gap:10px">
        <label class="search" style="margin:0">${icon("ph-magnifying-glass")}<input class="input" placeholder="Tìm kiếm tên Shop, MST, email..." id="mgr-store-search" /></label>
      </div>
    </div>

    <!-- Bảng Hồ Sơ Shop -->
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Mã / Tên Gian Hàng</th>
            <th>Người Đại Diện Pháp Luật</th>
            <th>Mã Số Thuế</th>
            <th>Tài Liệu Đính Kèm</th>
            <th>Ngày Nộp</th>
            <th>Trạng Thái</th>
            <th style="text-align:right">Thao Tác Thẩm Định</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.length > 0 ? filtered.map(st => `
            <tr>
              <td>
                <div style="font-weight:700;color:var(--text)">${st.name}</div>
                <div style="font-size:11.5px;color:var(--muted)">${st.id} • ${st.category}</div>
              </td>
              <td>
                <div>${st.owner}</div>
                <div style="font-size:11.5px;color:var(--muted)">${st.phone} • ${st.email}</div>
              </td>
              <td class="mono" style="font-weight:600">${st.taxCode}</td>
              <td>
                <span class="badge neutral" style="font-size:11.5px"><i class="ph ph-file-text"></i> ${st.documents.length} tài liệu PDF</span>
              </td>
              <td style="font-size:12px;color:var(--muted)">${st.submittedAt}</td>
              <td>${renderStoreStatusBadge(st.status)}</td>
              <td style="text-align:right">
                <div class="actions" style="justify-content:flex-end">
                  <button class="btn small secondary" data-mgr-view-store="${st.id}">Xem chi tiết</button>
                  ${st.status !== 'approved' ? `
                    <button class="btn small" data-mgr-approve-store="${st.id}" style="background:#059669;color:#fff"><i class="ph ph-check"></i> Duyệt</button>
                    <button class="icon-btn" data-mgr-need-info="${st.id}" title="Yêu cầu bổ sung tài liệu">${icon("ph-pencil-simple-line")}</button>
                    <button class="icon-btn danger" data-mgr-reject-store="${st.id}" title="Từ chối hồ sơ">${icon("ph-x")}</button>
                  ` : `
                    <span style="font-size:11.5px;color:#059669;font-weight:600;padding:4px 8px">Đang hoạt động</span>
                  `}
                </div>
              </td>
            </tr>
          `).join("") : `
            <tr>
              <td colspan="7" style="text-align:center;padding:36px;color:var(--muted)">
                <i class="ph ph-tray" style="font-size:32px;display:block;margin-bottom:8px"></i>
                Không tìm thấy hồ sơ Shop nào phù hợp với bộ lọc hiện tại.
              </td>
            </tr>
          `}
        </tbody>
      </table>
    </div>
  `;
}

// --------------------------------------------------------------------------
// 3. CHI TIẾT HỒ SƠ SHOP (STORE DETAIL)
// --------------------------------------------------------------------------
export function managerStoreDetailScreen() {
  const storeId = managerState.selectedStoreDetailId || "STORE-001";
  const st = managerState.stores.find(s => s.id === storeId) || managerState.stores[0];

  return `
    <header class="page-head">
      <div>
        <div class="crumb"><span>Vận hành / </span><a href="#manager-stores" style="color:var(--brand);text-decoration:none">Hồ sơ Shop</a> / <strong>${st.name}</strong></div>
        <h1>Chi Tiết Thẩm Định: ${st.name}</h1>
        <p>Kiểm tra thông tin pháp lý doanh nghiệp, người đại diện, danh mục sản phẩm và lịch sử thẩm định.</p>
      </div>
      <div class="actions">
        <button class="btn secondary" data-mgr-goto="manager-stores">&larr; Quay lại danh sách</button>
        ${st.status !== 'approved' ? `
          <button class="btn" data-mgr-approve-store="${st.id}" style="background:#059669;color:#fff"><i class="ph ph-check"></i> Phê duyệt & Kích hoạt</button>
          <button class="btn secondary" data-mgr-need-info="${st.id}"><i class="ph ph-file-arrow-up"></i> Yêu cầu bổ sung</button>
          <button class="btn danger" data-mgr-reject-store="${st.id}"><i class="ph ph-x"></i> Từ chối</button>
        ` : ''}
      </div>
    </header>

    <div class="split" style="grid-template-columns:1.2fr 0.8fr;gap:20px">
      <!-- Cột Trái: Thông tin pháp lý & Giấy phép -->
      <div class="card" style="padding:22px">
        <h3 style="margin-top:0;font-size:16px;border-bottom:1px solid var(--line);padding-bottom:10px">
          ${icon("ph-certificate")} Thông tin pháp lý doanh nghiệp
        </h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:16px 0">
          <div><small style="color:var(--muted)">Tên gian hàng</small><strong style="display:block;margin-top:2px">${st.name}</strong></div>
          <div><small style="color:var(--muted)">Mã số thuế (MST)</small><strong class="mono" style="display:block;margin-top:2px">${st.taxCode}</strong></div>
          <div><small style="color:var(--muted)">Người đại diện pháp luật</small><strong style="display:block;margin-top:2px">${st.owner}</strong></div>
          <div><small style="color:var(--muted)">Lĩnh vực kinh doanh</small><strong style="display:block;margin-top:2px">${st.category}</strong></div>
          <div><small style="color:var(--muted)">Email đối tác</small><strong style="display:block;margin-top:2px">${st.email}</strong></div>
          <div><small style="color:var(--muted)">Số điện thoại liên hệ</small><strong style="display:block;margin-top:2px">${st.phone}</strong></div>
        </div>

        <h3 style="margin:24px 0 12px;font-size:15px;border-bottom:1px solid var(--line);padding-bottom:8px">
          ${icon("ph-files")} Hồ sơ & Tài liệu đính kèm (${st.documents.length})
        </h3>
        <div style="display:flex;flex-direction:column;gap:10px">
          ${st.documents.map(doc => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2)">
              <div style="display:flex;align-items:center;gap:10px">
                <i class="ph ph-file-pdf" style="font-size:22px;color:#dc2626"></i>
                <span style="font-weight:600;font-size:13px">${doc}</span>
              </div>
              <button class="text-btn" data-mgr-toast="Đang mở bản xem trước tài liệu ${doc}"><i class="ph ph-eye"></i> Xem tài liệu</button>
            </div>
          `).join("")}
        </div>

        <h3 style="margin:24px 0 12px;font-size:15px;border-bottom:1px solid var(--line);padding-bottom:8px">
          ${icon("ph-note")} Ghi chú thẩm định của chuyên viên
        </h3>
        <div style="padding:14px;background:var(--surface-2);border-radius:8px;font-size:13px;line-height:1.5">
          ${st.notes || "Chưa có ghi chú thẩm định nào."}
          ${st.rejectionReason ? `<div style="margin-top:8px;color:#dc2626;font-weight:600">Lý do từ chối: ${st.rejectionReason}</div>` : ''}
        </div>
      </div>

      <!-- Cột Phải: Trạng thái & Quy trình thẩm định -->
      <div class="card" style="padding:22px">
        <h3 style="margin-top:0;font-size:16px;border-bottom:1px solid var(--line);padding-bottom:10px">
          ${icon("ph-git-commit")} Tiến trình xét duyệt
        </h3>
        
        <div class="stepper" style="display:flex;flex-direction:column;gap:18px;margin:20px 0">
          <div style="display:flex;gap:12px;align-items:flex-start">
            <span style="background:#059669;color:#fff;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-size:12px"><i class="ph ph-check"></i></span>
            <div>
              <strong style="font-size:13px">1. Nộp hồ sơ ban đầu</strong>
              <div style="font-size:11.5px;color:var(--muted)">Đã tiếp nhận vào lúc ${st.submittedAt}</div>
            </div>
          </div>
          <div style="display:flex;gap:12px;align-items:flex-start">
            <span style="background:${st.status !== 'pending' ? '#059669' : 'var(--brand)'};color:#fff;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-size:12px">
              ${st.status !== 'pending' ? '<i class="ph ph-check"></i>' : '2'}
            </span>
            <div>
              <strong style="font-size:13px">2. Thẩm định pháp lý & GPKD</strong>
              <div style="font-size:11.5px;color:var(--muted)">Kiểm tra thông tin trên Cổng thông tin ĐKKD Quốc gia</div>
            </div>
          </div>
          <div style="display:flex;gap:12px;align-items:flex-start">
            <span style="background:${st.status === 'approved' ? '#059669' : (st.status === 'rejected' ? '#dc2626' : 'var(--muted)')};color:#fff;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-size:12px">
              ${st.status === 'approved' ? '<i class="ph ph-check"></i>' : (st.status === 'rejected' ? '<i class="ph ph-x"></i>' : '3')}
            </span>
            <div>
              <strong style="font-size:13px">3. Kết luận & Phê duyệt</strong>
              <div style="font-size:11.5px;color:var(--muted)">Trạng thái hiện tại: ${renderStoreStatusBadge(st.status)}</div>
            </div>
          </div>
        </div>

        <div style="background:var(--surface-3);padding:14px;border-radius:10px;margin-top:20px">
          <small style="color:var(--muted);font-size:12px;display:block;margin-bottom:6px">Nguyên tắc phân quyền:</small>
          <ul style="margin:0;padding-left:18px;font-size:12px;color:var(--muted);line-height:1.6">
            <li>Chuyên viên Vận Hành Sàn chỉ duyệt hồ sơ gian hàng hợp lệ theo danh mục GPKD.</li>
            <li>Không tự ý can thiệp chính sách hoa hồng riêng của Shop.</li>
            <li>Không duyệt rút tiền chi trả thay Shop.</li>
          </ul>
        </div>
      </div>
    </div>
  `;
}

// --------------------------------------------------------------------------
// 4. DANH MỤC NGÂN HÀNG HỖ TRỢ (MANAGER BANKS)
// --------------------------------------------------------------------------
export function managerBanksScreen() {
  return `
    <header class="page-head">
      <div>
        <div class="crumb"><span>Vận hành / </span><strong>Cổng & Ngân hàng Hỗ trợ</strong></div>
        <h1>Danh Mục Ngân Hàng Chi Trả VietQR / Napas</h1>
        <p>Quản lý danh sách ngân hàng đối tác phục vụ thanh toán hoa hồng và liên kết tài khoản (Môi trường Sandbox Mô Phỏng).</p>
      </div>
      <div class="actions">
        <button class="btn" data-mgr-add-bank><i class="ph ph-plus"></i> Thêm ngân hàng hỗ trợ</button>
      </div>
    </header>

    <div class="toolbar" style="margin-bottom:18px">
      <span class="badge warning" style="font-size:12.5px;padding:8px 14px">
        ${icon("ph-warning")} <strong>Lưu ý vận hành:</strong> Khi tạm ngừng hỗ trợ một ngân hàng, các lệnh rút tiền đang chờ của CTV qua ngân hàng đó sẽ chuyển sang trạng thái chờ đổi tài khoản.
      </span>
    </div>

    <div class="grid" style="grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:16px">
      ${managerState.banks.map(bank => `
        <div class="card" style="padding:18px;position:relative;border:${bank.active ? '1px solid var(--line)' : '1px dashed #ef4444'}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
            <div style="display:flex;align-items:center;gap:12px">
              <div style="width:44px;height:44px;background:var(--brand-soft);color:var(--brand-strong);border-radius:10px;display:grid;place-items:center;font-size:22px">
                ${icon(bank.logo)}
              </div>
              <div>
                <strong style="font-size:15px;display:block">${bank.name}</strong>
                <small class="mono" style="color:var(--muted)">Mã BIN: ${bank.code} • ${bank.shortName}</small>
              </div>
            </div>
            <span class="badge ${bank.active ? 'success' : 'danger'}" style="font-size:11px">
              ${bank.active ? 'Hoạt động' : 'Tạm dừng'}
            </span>
          </div>

          <div style="font-size:12.5px;color:var(--muted);margin:12px 0;line-height:1.5">
            <div>${icon("ph-lightning")} Tốc độ: <strong>${bank.transferTime}</strong></div>
            <div>${icon("ph-receipt")} Sản lượng đối soát: <strong>${bank.totalPayouts}</strong></div>
            <div>${icon("ph-shield-check")} Cơ chế: <span class="badge neutral" style="font-size:11px">${bank.sandboxLabel}</span></div>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid var(--line)">
            <button class="btn small secondary" data-mgr-edit-bank="${bank.id}"><i class="ph ph-gear"></i> Cấu hình</button>
            <button class="btn small ${bank.active ? 'danger' : ''}" data-mgr-toggle-bank="${bank.id}" style="${!bank.active ? 'background:#059669;color:#fff' : ''}">
              ${bank.active ? '<i class="ph ph-pause"></i> Tạm dừng cổng' : '<i class="ph ph-play"></i> Bật kích hoạt'}
            </button>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

// --------------------------------------------------------------------------
// 5. XỬ LÝ CẢNH BÁO GIAN LẬN (MANAGER FRAUD)
// --------------------------------------------------------------------------
export function managerFraudScreen() {
  const filter = managerState.activeFraudFilter;
  const filtered = managerState.fraudAlerts.filter(f => {
    if (filter === "all") return true;
    if (filter === "pending") return f.status === "pending" || f.status === "processing";
    return f.riskLevel === filter;
  });

  return `
    <header class="page-head">
      <div>
        <div class="crumb"><span>Vận hành / </span><strong>Kiểm Soát Gian Lận</strong></div>
        <h1>Xử Lý Cảnh Báo Gian Lận (AI Fraud Sentinel)</h1>
        <p>Phân tích bằng chứng vi phạm, ghi nhận kết luận thẩm định hợp lệ/báo động giả hoặc chuyển cấp Admin xử lý khóa tài khoản.</p>
      </div>
      <div class="actions">
        <span class="badge neutral" style="font-size:12px"><i class="ph ph-info"></i> AI chỉ cảnh báo xác suất, quyền kết luận thuộc về nhân sự vận hành.</span>
      </div>
    </header>

    <div class="toolbar" style="margin-bottom:18px;display:flex;justify-content:space-between;align-items:center">
      <div class="segmented" style="margin:0">
        <button class="${filter === 'all' ? 'active' : ''}" data-mgr-fraud-filter="all">Tất cả (${managerState.fraudAlerts.length})</button>
        <button class="${filter === 'pending' ? 'active' : ''}" data-mgr-fraud-filter="pending">Chờ & Đang xử lý (${managerState.fraudAlerts.filter(f => f.status === 'pending' || f.status === 'processing').length})</button>
        <button class="${filter === 'high' ? 'active' : ''}" data-mgr-fraud-filter="high">Rủi ro cao (${managerState.fraudAlerts.filter(f => f.riskLevel === 'high').length})</button>
        <button class="${filter === 'medium' ? 'active' : ''}" data-mgr-fraud-filter="medium">Rủi ro vừa (${managerState.fraudAlerts.filter(f => f.riskLevel === 'medium').length})</button>
      </div>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Mã / Thời Gian</th>
            <th>Đối Tượng Bị Cảnh Báo</th>
            <th>Mức Độ Rủi Ro</th>
            <th>Bằng Chứng / Dấu Hiệu Vi Phạm</th>
            <th>Địa Chỉ IP / Thiết Bị</th>
            <th>Trạng Thái Xử Lý</th>
            <th style="text-align:right">Thao Tác</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(fa => `
            <tr>
              <td>
                <strong class="mono">${fa.id}</strong>
                <div style="font-size:11px;color:var(--muted)">${fa.detectedAt}</div>
              </td>
              <td>
                <strong style="color:var(--text)">${fa.kolName}</strong>
                <div style="font-size:11.5px;color:var(--muted)">${fa.kolId} &rarr; Shop: ${fa.targetStore}</div>
              </td>
              <td>
                <span class="badge ${fa.riskLevel === 'high' ? 'danger' : (fa.riskLevel === 'medium' ? 'warning' : 'neutral')}" style="font-weight:700">
                  ${fa.riskLevel.toUpperCase()} (${fa.score}đ)
                </span>
              </td>
              <td style="max-width:320px;font-size:12.5px;line-height:1.4">
                ${fa.reason}
                ${fa.resolutionNote ? `<div style="font-size:11px;color:#059669;margin-top:4px"><strong>Kết luận:</strong> ${fa.resolutionNote}</div>` : ''}
              </td>
              <td class="mono" style="font-size:12px">${fa.ipAddress}</td>
              <td>
                ${fa.status === 'pending' ? '<span class="badge warning">Chờ tiếp nhận</span>' :
                  (fa.status === 'processing' ? '<span class="badge info">Đang xử lý</span>' :
                  (fa.status === 'false_positive' ? '<span class="badge success">Báo động giả</span>' : '<span class="badge danger">Đã xử lý gian lận</span>'))}
              </td>
              <td style="text-align:right">
                <button class="btn small" data-mgr-handle-fraud="${fa.id}">
                  ${fa.status === 'pending' ? 'Tiếp nhận' : 'Xem kết luận'}
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
// 6. NHẬT KÝ VẬN HÀNH (MANAGER AUDIT - READ ONLY)
// --------------------------------------------------------------------------
export function managerAuditScreen() {
  return `
    <header class="page-head">
      <div>
        <div class="crumb"><span>Vận hành / </span><strong>Nhật ký Vận hành</strong></div>
        <h1>Nhật Ký Thao Tác Vận Hành (Operational Audit Log)</h1>
        <p>Lưu vết bất biến mọi hành động xét duyệt hồ sơ Shop, cấu hình ngân hàng và kết luận xử lý gian lận (Chỉ đọc - Không sửa/xóa).</p>
      </div>
      <div class="actions">
        <button class="btn secondary" data-mgr-toast="Đã xuất log vận hành ra file CSV"><i class="ph ph-download-simple"></i> Xuất CSV Log</button>
      </div>
    </header>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Mã Log</th>
            <th>Thời Gian (UTC+7)</th>
            <th>Chuyên Viên Vận Hành</th>
            <th>Hành Động Thực Hiện</th>
            <th>Đối Tượng Tác Động</th>
            <th>Ghi Chú Chi Tiết</th>
          </tr>
        </thead>
        <tbody>
          ${managerState.opsLogs.map(log => `
            <tr>
              <td class="mono" style="font-weight:600">${log.id}</td>
              <td class="mono" style="font-size:12px;color:var(--muted)">${log.time}</td>
              <td><strong>${log.actor}</strong></td>
              <td><span class="badge neutral" style="font-weight:600">${log.action}</span></td>
              <td class="mono">${log.target}</td>
              <td style="font-size:12.5px">${log.note}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

// --------------------------------------------------------------------------
// 7. TÀI KHOẢN VẬN HÀNH (MANAGER PROFILE)
// --------------------------------------------------------------------------
export function managerProfileScreen() {
  return `
    <header class="page-head">
      <div>
        <div class="crumb"><span>Vận hành / </span><strong>Hồ sơ Vận hành</strong></div>
        <h1>Tài Khoản & Bảo Mật Chuyên Viên Vận Hành</h1>
        <p>Quản lý thông tin tài khoản nội bộ Chuyên viên Vận Hành Sàn và phiên đăng nhập hiện tại.</p>
      </div>
    </header>

    <div class="split" style="grid-template-columns:1fr 1fr;gap:20px">
      <div class="card" style="padding:22px">
        <h3 style="margin-top:0;font-size:16px;border-bottom:1px solid var(--line);padding-bottom:10px">${icon("ph-user")} Thông tin cá nhân</h3>
        <div style="display:flex;align-items:center;gap:16px;margin:16px 0">
          <div style="width:60px;height:60px;border-radius:50%;background:#0284c7;color:#fff;display:grid;place-items:center;font-size:26px;font-weight:700">VH</div>
          <div>
            <strong style="font-size:17px;display:block">Lê Hồng Phúc</strong>
            <span style="font-size:12.5px;color:var(--muted)">Chuyên viên Vận Hành Sàn • ID: SM-0042</span>
          </div>
        </div>
        <div class="form-stack">
          <div class="field"><label>Email công vụ</label><input class="input" value="manager@scanms.vn" disabled /></div>
          <div class="field"><label>Số điện thoại xác thực</label><input class="input" value="0988 123 456" /></div>
          <button class="btn secondary" data-mgr-toast="Đã cập nhật thông tin tài khoản vận hành.">Lưu thay đổi</button>
        </div>
      </div>

      <div class="card" style="padding:22px">
        <h3 style="margin-top:0;font-size:16px;border-bottom:1px solid var(--line);padding-bottom:10px">${icon("ph-lock-key")} Đổi mật khẩu & Quản lý phiên</h3>
        <div class="form-stack" style="margin-top:16px">
          <div class="field"><label>Mật khẩu hiện tại</label><input class="input" type="password" value="••••••••" /></div>
          <div class="field"><label>Mật khẩu mới</label><input class="input" type="password" placeholder="Tối thiểu 8 ký tự, có số và ký tự đặc biệt" /></div>
          <button class="btn secondary" data-mgr-toast="Đã đổi mật khẩu thành công!">Đổi mật khẩu</button>
        </div>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--line)">
          <small style="color:var(--muted);display:block;margin-bottom:6px">Phiên làm việc hiện tại: <strong>Chrome trên Windows (IP: 118.69.12.44)</strong></small>
          <button class="btn danger small" data-mgr-toast="Đã đăng xuất khỏi các thiết bị khác!">Đăng xuất phiên khác</button>
        </div>
      </div>
    </div>
  `;
}

// --------------------------------------------------------------------------
// BINDING LOGIC CHO SYSTEM MANAGER
// --------------------------------------------------------------------------
export function bindManager(root, { toast, go, renderCurrentPage }) {
  // Navigation shortcuts
  root.querySelectorAll("[data-mgr-goto]").forEach(el => {
    el.addEventListener("click", () => {
      const scr = el.dataset.mgrGoto;
      if (el.dataset.mgrFilter) {
        if (scr === "manager-stores") managerState.activeStoreFilter = el.dataset.mgrFilter;
        if (scr === "manager-fraud") managerState.activeFraudFilter = el.dataset.mgrFilter;
      }
      go(scr);
    });
  });

  // Store filters
  root.querySelectorAll("[data-mgr-store-filter]").forEach(btn => {
    btn.addEventListener("click", () => {
      managerState.activeStoreFilter = btn.dataset.mgrStoreFilter;
      renderCurrentPage();
    });
  });

  // Fraud filters
  root.querySelectorAll("[data-mgr-fraud-filter]").forEach(btn => {
    btn.addEventListener("click", () => {
      managerState.activeFraudFilter = btn.dataset.mgrFraudFilter;
      renderCurrentPage();
    });
  });

  // View store detail
  root.querySelectorAll("[data-mgr-view-store]").forEach(btn => {
    btn.addEventListener("click", () => {
      managerState.selectedStoreDetailId = btn.dataset.mgrViewStore;
      go("manager-store-detail");
    });
  });

  // Approve store
  root.querySelectorAll("[data-mgr-approve-store]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.mgrApproveStore;
      const st = managerState.stores.find(s => s.id === id);
      if (!st) return;
      if (confirm(`Xác nhận phê duyệt và kích hoạt gian hàng "${st.name}" lên hệ thống SCANMS?`)) {
        st.status = "approved";
        managerState.opsLogs.unshift({
          id: `LOG-${Date.now().toString().slice(-4)}`,
          time: "Vừa xong",
          actor: "Lê Hồng Phúc (Vận Hành Sàn)",
          action: "PHÊ DUYỆT SHOP",
          target: `${st.id} (${st.name})`,
          note: "Đã kiểm tra đầy đủ hồ sơ pháp lý và kích hoạt tài khoản đối tác."
        });
        toast(`Đã phê duyệt và kích hoạt thành công gian hàng ${st.name}!`);
        renderCurrentPage();
      }
    });
  });

  // Request additional info
  root.querySelectorAll("[data-mgr-need-info]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.mgrNeedInfo;
      const st = managerState.stores.find(s => s.id === id);
      if (!st) return;
      const reason = prompt(`Nhập nội dung/tài liệu yêu cầu Shop "${st.name}" bổ sung:`, "Vui lòng bổ sung Giấy chứng nhận công bố sản phẩm hoặc Giấy ủy quyền phân phối thương hiệu.");
      if (reason) {
        st.status = "need_info";
        st.notes = `Yêu cầu bổ sung: ${reason}`;
        managerState.opsLogs.unshift({
          id: `LOG-${Date.now().toString().slice(-4)}`,
          time: "Vừa xong",
          actor: "Lê Hồng Phúc (Vận Hành Sàn)",
          action: "YÊU CẦU BỔ SUNG",
          target: `${st.id} (${st.name})`,
          note: reason
        });
        toast(`Đã gửi yêu cầu bổ sung hồ sơ tới Shop ${st.name}.`);
        renderCurrentPage();
      }
    });
  });

  // Reject store
  root.querySelectorAll("[data-mgr-reject-store]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.mgrRejectStore;
      const st = managerState.stores.find(s => s.id === id);
      if (!st) return;
      const reason = prompt(`Nhập lý do từ chối hồ sơ Shop "${st.name}":`, "Không đáp ứng tiêu chuẩn kinh doanh ngành hàng theo quy chế sàn.");
      if (reason) {
        st.status = "rejected";
        st.rejectionReason = reason;
        managerState.opsLogs.unshift({
          id: `LOG-${Date.now().toString().slice(-4)}`,
          time: "Vừa xong",
          actor: "Lê Hồng Phúc (Vận Hành Sàn)",
          action: "TỪ CHỐI SHOP",
          target: `${st.id} (${st.name})`,
          note: `Lý do từ chối: ${reason}`
        });
        toast(`Đã từ chối hồ sơ Shop ${st.name}. Thông báo đã được gửi qua email.`);
        renderCurrentPage();
      }
    });
  });

  // Handle fraud
  root.querySelectorAll("[data-mgr-handle-fraud]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.mgrHandleFraud;
      const fa = managerState.fraudAlerts.find(f => f.id === id);
      if (!fa) return;
      const action = prompt(`Xử lý cảnh báo ${fa.id} (${fa.kolName}):\n1. Nhập 'OK' để kết luận Hợp Lệ (Báo động giả)\n2. Nhập 'FRAUD' để kết luận Gian Lận (Tạm giữ hoa hồng)\n3. Nhập 'ADMIN' để Chuyển cấp Quản Trị Hệ Thống khóa tài khoản`, "OK");
      if (action === "OK") {
        fa.status = "false_positive";
        fa.resolutionNote = "Đã xác minh lưu lượng truy cập thực tế, kết luận báo động giả.";
        toast(`Đã cập nhật cảnh báo ${fa.id}: Báo động giả (Hợp lệ).`);
        renderCurrentPage();
      } else if (action === "FRAUD") {
        fa.status = "resolved_fraud";
        fa.resolutionNote = "Xác nhận vi phạm gian lận click: Đã khóa tạm giữ các đơn hàng liên quan.";
        toast(`Đã xử lý gian lận cho cảnh báo ${fa.id}!`);
        renderCurrentPage();
      } else if (action === "ADMIN") {
        fa.status = "escalated";
        fa.resolutionNote = "Đã chuyển cấp Quản Trị Hệ Thống đề xuất khóa tài khoản.";
        toast(`Đã chuyển cảnh báo ${fa.id} lên Quản Trị Hệ Thống xử lý khóa.`);
        renderCurrentPage();
      }
    });
  });

  // Toggle bank
  root.querySelectorAll("[data-mgr-toggle-bank]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.mgrToggleBank;
      const b = managerState.banks.find(bk => bk.id === id);
      if (!b) return;
      b.active = !b.active;
      toast(`Đã ${b.active ? 'kích hoạt' : 'tạm dừng'} kết nối cổng ngân hàng ${b.name}!`);
      renderCurrentPage();
    });
  });

  // Add bank demo
  root.querySelector("[data-mgr-add-bank]")?.addEventListener("click", () => {
    const name = prompt("Nhập tên ngân hàng đối tác mới:", "BIDV (Ngân hàng Đầu tư và Phát triển)");
    if (name) {
      managerState.banks.push({
        id: `BANK-${Date.now().toString().slice(-3)}`,
        code: "970418",
        name: name,
        shortName: "BIDV",
        logo: "ph-bank",
        active: true,
        transferTime: "Tức thì (24/7)",
        sandboxLabel: "Sandbox Simulator",
        totalPayouts: "0 đơn"
      });
      toast(`Đã bổ sung ${name} vào danh mục ngân hàng hỗ trợ!`);
      renderCurrentPage();
    }
  });

  // Generic toasts
  root.querySelectorAll("[data-mgr-toast]").forEach(el => {
    el.addEventListener("click", () => toast(el.dataset.mgrToast));
  });
}
