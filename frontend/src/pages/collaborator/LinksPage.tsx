import { useState } from 'react';

export default function LinksPage() {
  const [selectedProduct, setSelectedProduct] = useState('SKIN-C15');
  const [selectedChannel, setSelectedChannel] = useState('tiktok');
  const [utmCampaign, setUtmCampaign] = useState('routine_sang');
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const products: Record<string, any> = {
    'SKIN-C15': {
      name: 'Serum vitamin C 15%',
      sku: 'SKIN-C15',
      category: 'Chăm sóc da',
      price: 459000,
      stock: 426,
      baseRate: 8,
      tierBonus: 3,
      image: '/assets/serum-hero-optimized.jpg',
    },
    'SUN-AQUA': {
      name: 'Kem chống nắng SPF50+',
      sku: 'SUN-AQUA',
      category: 'Bảo vệ da',
      price: 389000,
      stock: 238,
      baseRate: 10,
      tierBonus: 3,
      image: '/assets/sunscreen-product.jpg',
    },
    'TONER-BHA': {
      name: 'Nước hoa hồng BHA 2%',
      sku: 'TONER-BHA',
      category: 'Tẩy tế bào chết',
      price: 320000,
      stock: 154,
      baseRate: 9,
      tierBonus: 3,
      image: '/assets/toner-bha-product.jpg',
    },
  };

  const prod = products[selectedProduct] || products['SKIN-C15'];
  const baseCommission = Math.round((prod.price * prod.baseRate) / 100);
  const tierCommission = Math.round((prod.price * prod.tierBonus) / 100);
  const totalCommission = baseCommission + tierCommission;
  const totalRate = prod.baseRate + prod.tierBonus;

  const handleGenerate = () => {
    const link = `https://scanms.vn/aff/nhat?sku=${prod.sku}&utm_source=${selectedChannel}&utm_campaign=${utmCampaign}&utm_medium=affiliate`;
    setGeneratedLink(link);
    setToastMsg('Đã tạo liên kết định danh và mã QR thành công!');
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setToastMsg('Đã sao chép link định danh vào Clipboard!');
    setTimeout(() => {
      setCopied(false);
      setToastMsg(null);
    }, 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {toastMsg && <div className="toast show">{toastMsg}</div>}

      {/* 1. HEADER */}
      <header className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 4px', color: 'var(--ink)' }}>
            Link và Mã QR Tiếp Thị
          </h1>
          <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--muted)' }}>
            Chọn sản phẩm, kênh phân phối, gắn mã tracking và nhận mã QR quét được để xuất bản nội dung bán hàng.
          </p>
        </div>

        <select
          className="select"
          defaultValue="available"
          style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-2)', fontSize: '12.5px', color: 'var(--ink)' }}
        >
          <option value="available">Kho hàng khả dụng</option>
          <option value="all">Tất cả kho hàng</option>
        </select>
      </header>

      {/* 2. SPLIT LAYOUT MATCHING PROTOTYPE */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 380px)', gap: '20px', alignItems: 'start' }}>
        {/* LEFT COLUMN: 2-STEP CONFIG */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* STEP 1 */}
          <div className="card" style={{ padding: '24px', background: 'var(--surface)', borderRadius: '14px', border: '1px solid var(--line)', boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--brand-strong)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '13px', fontWeight: 800 }}>
                1
              </span>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--ink)' }}>
                Chọn sản phẩm &amp; Xem hoa hồng
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="field">
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '4px', display: 'block' }}>
                  Tìm kiếm nhanh
                </label>
                <input
                  type="text"
                  placeholder="Nhập tên sản phẩm hoặc mã SKU..."
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-2)', color: 'var(--ink)' }}
                />
              </div>

              <div className="field">
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '4px', display: 'block' }}>
                  Sản phẩm tiếp thị
                </label>
                <select
                  className="select"
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-2)', color: 'var(--ink)' }}
                >
                  <option value="SKIN-C15">Serum vitamin C 15% • 459.000 ₫ • Hoa hồng 11% [Còn 426]</option>
                  <option value="SUN-AQUA">Kem chống nắng SPF50+ • 389.000 ₫ • Hoa hồng 13% [Còn 238]</option>
                  <option value="TONER-BHA">Nước hoa hồng BHA 2% • 320.000 ₫ • Hoa hồng 12% [Còn 154]</option>
                </select>
              </div>

              {/* PRODUCT SUMMARY CARD */}
              <div style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '14px' }}>
                  <img
                    src={prod.image}
                    alt={prod.name}
                    style={{ width: '64px', height: '64px', borderRadius: '10px', objectFit: 'cover', border: '1px solid var(--line)' }}
                  />
                  <div>
                    <strong style={{ fontSize: '15px', color: 'var(--ink)', display: 'block' }}>{prod.name}</strong>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', margin: '2px 0 6px' }}>
                      Mã SKU: <strong style={{ fontFamily: 'monospace' }}>{prod.sku}</strong> • Danh mục: {prod.category}
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#D1FAE5', color: '#059669' }}>
                      ✓ Còn {prod.stock} sản phẩm
                    </span>
                  </div>
                  <strong style={{ marginLeft: 'auto', fontSize: '17px', color: 'var(--ink)' }}>
                    {prod.price.toLocaleString('vi-VN')} ₫
                  </strong>
                </div>

                {/* 3 COMMISSION CELLS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', background: 'var(--surface)', padding: '12px', borderRadius: '8px', border: '1px solid var(--line)', textAlign: 'center' }}>
                  <div>
                    <span style={{ fontSize: '10.5px', color: 'var(--muted)', display: 'block' }}>HOA HỒNG CƠ BẢN ({prod.baseRate}%)</span>
                    <strong style={{ fontSize: '13.5px', color: 'var(--ink)' }}>{baseCommission.toLocaleString('vi-VN')} ₫</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '10.5px', color: 'var(--muted)', display: 'block' }}>THƯỞNG HẠNG VÀNG (+{prod.tierBonus}%)</span>
                    <strong style={{ fontSize: '13.5px', color: 'var(--brand-strong)' }}>+{tierCommission.toLocaleString('vi-VN')} ₫</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '10.5px', color: 'var(--muted)', display: 'block' }}>TỔNG THỰC NHẬN ({totalRate}%)</span>
                    <strong style={{ fontSize: '14px', color: '#059669' }}>{totalCommission.toLocaleString('vi-VN')} ₫</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2 */}
          <div className="card" style={{ padding: '24px', background: 'var(--surface)', borderRadius: '14px', border: '1px solid var(--line)', boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--brand-strong)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '13px', fontWeight: 800 }}>
                2
              </span>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--ink)' }}>
                Kênh phân phối &amp; Chiến dịch
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="field">
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '4px', display: 'block' }}>
                  Kênh phân phối
                </label>
                <select
                  className="select"
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-2)', color: 'var(--ink)' }}
                >
                  <option value="tiktok">TikTok • @tuanaffiliate.official</option>
                  <option value="facebook">Facebook Fanpage • Tuấn Review</option>
                  <option value="youtube">YouTube • Tuấn Tech &amp; Lifestyle</option>
                  <option value="instagram">Instagram • @tuan.deals</option>
                </select>
                <small style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                  Mỗi kênh sẽ gắn tag UTM riêng để báo cáo hiệu suất chính xác.
                </small>
              </div>

              <div className="field">
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '4px', display: 'block' }}>
                  Tên chiến dịch / UTM Campaign (tùy chọn)
                </label>
                <input
                  type="text"
                  value={utmCampaign}
                  onChange={(e) => setUtmCampaign(e.target.value)}
                  placeholder="VD: routine_sang"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-2)', color: 'var(--ink)', fontFamily: 'monospace' }}
                />
              </div>

              <button
                type="button"
                className="btn"
                onClick={handleGenerate}
                style={{ background: 'var(--brand-strong)', color: '#fff', border: 'none', padding: '11px', borderRadius: '8px', fontWeight: 700, fontSize: '13.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <i className="ph ph-lightning"></i> Tạo link tiếp thị &amp; Mã QR mới
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DYNAMIC QR DISPLAY */}
        <div className="card" style={{ padding: '24px', background: 'var(--surface)', borderRadius: '14px', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--ink)' }}>
              Mã QR Động Quét Được
            </h3>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: generatedLink ? '#D1FAE5' : 'var(--surface-2)', color: generatedLink ? '#059669' : 'var(--muted)' }}>
              {generatedLink ? 'Sẵn sàng quét' : 'Chờ tạo link'}
            </span>
          </div>

          <div style={{ background: 'var(--surface-2)', borderRadius: '12px', border: '1px dashed var(--line)', padding: '24px', display: 'grid', placeItems: 'center', minHeight: '260px', textAlign: 'center' }}>
            {generatedLink ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '180px', height: '180px', background: '#fff', padding: '10px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', display: 'grid', placeItems: 'center' }}>
                  {/* High quality SVG QR Code illustration */}
                  <svg width="150" height="150" viewBox="0 0 100 100">
                    <rect width="100" height="100" fill="#ffffff" />
                    {/* Top-left corner */}
                    <rect x="5" y="5" width="30" height="30" fill="#2C2114" rx="4" />
                    <rect x="10" y="10" width="20" height="20" fill="#ffffff" rx="2" />
                    <rect x="15" y="15" width="10" height="10" fill="#2C2114" />
                    {/* Top-right corner */}
                    <rect x="65" y="5" width="30" height="30" fill="#2C2114" rx="4" />
                    <rect x="70" y="10" width="20" height="20" fill="#ffffff" rx="2" />
                    <rect x="75" y="15" width="10" height="10" fill="#2C2114" />
                    {/* Bottom-left corner */}
                    <rect x="5" y="65" width="30" height="30" fill="#2C2114" rx="4" />
                    <rect x="10" y="70" width="20" height="20" fill="#ffffff" rx="2" />
                    <rect x="15" y="75" width="10" height="10" fill="#2C2114" />
                    {/* Data dots */}
                    <rect x="42" y="12" width="6" height="6" fill="#C9A363" />
                    <rect x="50" y="20" width="6" height="6" fill="#2C2114" />
                    <rect x="42" y="28" width="6" height="6" fill="#2C2114" />
                    <rect x="12" y="42" width="6" height="6" fill="#2C2114" />
                    <rect x="25" y="45" width="6" height="6" fill="#C9A363" />
                    <rect x="45" y="45" width="10" height="10" fill="#2C2114" />
                    <rect x="65" y="42" width="6" height="6" fill="#2C2114" />
                    <rect x="80" y="48" width="6" height="6" fill="#C9A363" />
                    <rect x="45" y="65" width="6" height="6" fill="#2C2114" />
                    <rect x="55" y="75" width="8" height="8" fill="#C9A363" />
                    <rect x="72" y="68" width="6" height="6" fill="#2C2114" />
                    <rect x="85" y="80" width="8" height="8" fill="#2C2114" />
                  </svg>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Quét để mở trang đích Storefront của Shop</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--muted)' }}>
                <i className="ph ph-qr-code" style={{ fontSize: '42px' }}></i>
                <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>Chưa có mã QR</strong>
                <span style={{ fontSize: '12px' }}>Vui lòng chọn sản phẩm, kênh và nhấn "Tạo link tiếp thị" để xem mã QR quét được.</span>
              </div>
            )}
          </div>

          {generatedLink && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ background: 'var(--surface-2)', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="text"
                  readOnly
                  value={generatedLink}
                  style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '11px', fontFamily: 'monospace', color: 'var(--ink)' }}
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  style={{ background: 'var(--brand-strong)', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  {copied ? 'Đã chép' : 'Copy'}
                </button>
              </div>

              <button
                type="button"
                className="btn secondary"
                onClick={() => setToastMsg('Đang xuất tệp ảnh QR độ nét cao (.png)...')}
                style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-2)', color: 'var(--ink)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <i className="ph ph-download-simple"></i> Tải ảnh QR PNG (Độ nét cao)
              </button>
            </div>
          )}

          <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5, borderTop: '1px dashed var(--line)', paddingTop: '10px' }}>
            <strong style={{ color: 'var(--ink)', display: 'block', marginBottom: '2px' }}>
              ▸ Mẹo sử dụng mã QR hiệu quả
            </strong>
            Chèn mã QR này vào góc video review TikTok / YouTube hoặc in trên danh thiếp quà tặng để nhận hoa hồng trọn đời.
          </div>
        </div>
      </div>
    </div>
  );
}
