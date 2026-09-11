import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../../components/common/Modal';
import CreatorCard from './CreatorCard';
import ProductCard from './ProductCard';
import MarketplaceHeader from './MarketplaceHeader';
import { marketplaceProducts as products, marketplaceKOLs as creators, marketplaceVideos as videos } from './marketplaceData';
import { calculateCart, formatMoney, normalizeSearch } from './marketplaceUtils';
import type { CartLine, Category, DemoOrder, MarketplaceDialog, Product } from './marketplace.types';
import './marketplace.css';

export default function MarketplacePage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [creatorId, setCreatorId] = useState(creators[0].id);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [dialog, setDialog] = useState<MarketplaceDialog>(null);
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState('');
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [orders, setOrders] = useState<DemoOrder[]>([]);
  const [trackingPhone, setTrackingPhone] = useState('');
  const [searchedPhone, setSearchedPhone] = useState<string | null>(null);
  const creator = creators.find(item => item.id === creatorId) ?? creators[0];
  const summary = calculateCart(cart, products, creator);
  const filtered = products.filter(product => (category === 'all' || product.category === category)
    && normalizeSearch(`${product.name} ${product.brand} ${product.kol.name} ${product.kol.coupon}`).includes(normalizeSearch(query)));
  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);
  async function copyCoupon(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code); setNotice(`Đã sao chép ${code}`);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(''), 2000);
    } catch { setNotice(`Không thể sao chép tự động. Mã của bạn: ${code}`); }
  }
  function addProduct(product: Product) {
    setCart(previous => {
      const existing = previous.find(line => line.productId === product.id);
      return existing ? previous.map(line => line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line) : [...previous, { productId: product.id, quantity: 1 }];
    });
    setNotice(`Đã thêm ${product.name} vào giỏ hàng demo.`);
  }
  function changeQuantity(productId: string, difference: number) {
    setCart(previous => previous.map(line => line.productId === productId ? { ...line, quantity: line.quantity + difference } : line).filter(line => line.quantity > 0));
  }
  function checkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cart.length) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    const phone = String(form.get('phone') ?? '').trim();
    const address = String(form.get('address') ?? '').trim();
    if (!name || !address || !/^0\d{9}$/.test(phone)) { setNotice('Nhập họ tên, địa chỉ và số điện thoại Việt Nam gồm 10 chữ số.'); return; }
    const order: DemoOrder = { id: `DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, name, phone, address, createdAt: new Date().toISOString(), lines: cart.map(line => ({ ...line })), ...summary, coupon: creator.coupon };
    setOrders(previous => [...previous, order]); setCart([]); setDialog(null);
    setTrackingPhone(phone); setSearchedPhone(phone);
    setNotice(`Đã tạo đơn mô phỏng ${order.id}. Không thanh toán và không gửi đơn thật.`);
  }
  const dialogTitle = !dialog ? '' : ({ guide: 'Cách nhận ưu đãi', policy: 'Chính sách mua hàng', creator: 'Hồ sơ Creator', terms: 'Điều kiện mã ưu đãi', product: 'Chi tiết sản phẩm', video: 'Video review mẫu', cart: 'Giỏ hàng', checkout: 'Đặt hàng mô phỏng' })[dialog.kind];
  return <div className="react-marketplace storefront-wrapper mp-page-wrapper">
    <MarketplaceHeader query={query} category={category} count={products.length} cartCount={cart.reduce((sum, line) => sum + line.quantity, 0)} onQuery={setQuery} onCategory={setCategory} onCart={() => setDialog({ kind: 'cart' })} />
    <main>
      <section className="mp-hero-section"><div className="mp-hero-banner"><div className="mp-hero-content">
        <h1 className="mp-hero-title">Chọn món bạn thích.<br /><span className="mp-gold-highlight">Ưu đãi từ Creator.</span></h1>
        <p className="mp-hero-desc">Khám phá sản phẩm qua review và chọn mã ưu đãi từ Creator yêu thích.</p>
        <div className="mp-hero-cta-group"><a className="mp-hero-btn-primary" href="#products"><i className="ph ph-shopping-bag" aria-hidden="true" />Khám phá sản phẩm</a><button className="mp-hero-btn-secondary" type="button" onClick={() => setDialog({ kind: 'guide' })}>Cách nhận ưu đãi</button></div>
      </div><aside className="react-voucher"><div className="react-voucher-heading"><i className="ph ph-ticket" aria-hidden="true" /><div><small>Ưu đãi từ Creator</small><h2>{creator.name}</h2></div></div>
        <p className="react-discount">Giảm <strong>{creator.voucherInfo.discount}</strong></p><p>Tối đa {creator.voucherInfo.maxDiscount} · Đơn từ {creator.voucherInfo.minOrder}</p>
        <div className="mp-voucher-code-group"><code>{creator.coupon}</code><button type="button" className="mp-voucher-copy-btn" onClick={() => void copyCoupon(creator.coupon)}>{copied === creator.coupon ? 'Đã sao chép' : 'Sao chép'}</button></div>
        <button type="button" className="mp-terms-link" onClick={() => setDialog({ kind: 'terms', creator })}>Điều kiện áp dụng →</button>
      </aside></div></section>
      <section className="mp-benefits-section" aria-label="Quyền lợi mua hàng"><div className="mp-benefits-bar">{([
        ['guest', 'ph-lightning', 'Mua không cần tài khoản', 'Đặt hàng bằng số điện thoại và địa chỉ'],
        ['voucher', 'ph-ticket', 'Ưu đãi từ Creator', 'Xem điều kiện trước khi chọn mã giảm giá'],
        ['return', 'ph-arrows-clockwise', 'Chính sách đổi trả', 'Kiểm tra chính sách của từng gian hàng'],
      ] as const).map(([policy, icon, title, description]) => <button type="button" key={policy} className="mp-benefit-item" onClick={() => setDialog({ kind: 'policy', policy })}><span className="mp-benefit-icon"><i className={`ph ${icon}`} aria-hidden="true" /></span><span className="mp-benefit-text"><strong className="mp-benefit-title">{title}</strong><span className="mp-benefit-desc">{description}</span></span></button>)}</div></section>
      <section className="mp-creator-section"><div className="mp-creator-head"><h2 className="mp-creator-heading">Creator bạn thích, ưu đãi bạn chọn</h2><p className="mp-creator-subheading">Xem lĩnh vực review, so sánh mức giảm và chọn mã phù hợp.</p><p className="mp-selection-summary">Đang chọn <strong>{creator.coupon}</strong> từ {creator.name}</p></div><div className="mp-creator-grid">{creators.map(item => <CreatorCard key={item.id} creator={item} selected={creatorId === item.id} copied={copied === item.coupon} onSelect={() => { setCreatorId(item.id); setNotice(`Đã chọn mã ${item.coupon}`); }} onCopy={() => void copyCoupon(item.coupon)} onTerms={() => setDialog({ kind: 'terms', creator: item })} onProfile={() => setDialog({ kind: 'creator', creator: item })} />)}</div></section>
      <section id="products" className="react-section"><div className="react-section-heading"><h2>Khám phá sản phẩm</h2><span>{filtered.length} sản phẩm</span></div>
        {filtered.length ? <div className="react-product-grid">{filtered.map(product => <ProductCard key={product.id} product={product} onOpen={() => setDialog({ kind: 'product', product })} onAdd={() => addProduct(product)} />)}</div> : <div className="react-empty"><h3>Không tìm thấy sản phẩm</h3><p>Thử từ khóa khác hoặc bỏ bộ lọc.</p><button type="button" className="react-primary" onClick={() => { setQuery(''); setCategory('all'); }}>Xóa bộ lọc</button></div>}
      </section>
      <section className="react-section"><h2>Review từ Creator</h2><div className="react-product-grid">{videos.map(video => <button type="button" className="react-review" key={video.id} onClick={() => setDialog({ kind: 'video', video })}><img src={video.thumbnail} alt="" loading="lazy" width="320" height="200" /><span><i className="ph ph-play-circle" aria-hidden="true" /> {video.title}</span><small>{video.kol}</small></button>)}</div></section>
      <section id="tracking" className="react-section react-tracking"><h2>Tra cứu đơn hàng demo</h2><p>Chỉ tra cứu đơn mô phỏng vừa tạo trong phiên này. Không lưu thông tin giao hàng vào trình duyệt.</p><form onSubmit={event => { event.preventDefault(); setSearchedPhone(trackingPhone.trim()); }}><label htmlFor="tracking-phone">Số điện thoại đặt hàng</label><div className="react-inline"><input id="tracking-phone" type="tel" pattern="0[0-9]{9}" required value={trackingPhone} onChange={event => setTrackingPhone(event.target.value)} placeholder="0901234567" /><button className="react-primary" type="submit">Tra cứu</button></div></form>
        {searchedPhone !== null && <div role="status">{orders.filter(order => order.phone === searchedPhone).length ? orders.filter(order => order.phone === searchedPhone).map(order => <p key={order.id}><strong>{order.id}</strong> · {formatMoney(order.total)} · Đơn mô phỏng, chưa gửi đi</p>) : <p>Không tìm thấy đơn demo với số điện thoại này.</p>}</div>}
      </section>
    </main>
    <footer className="react-footer"><strong>SCANMS</strong><span>Giao diện của Nguyễn Đình Tuấn · React 19 + TypeScript</span><Link to="/ui-reference">Các màn hình đối tác, quản trị & đăng ký</Link></footer>
    {notice && <div className="react-notice" role="status"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Đóng thông báo">×</button></div>}
    {dialog && <Modal title={dialogTitle} onClose={() => setDialog(null)}>
      {dialog.kind === 'guide' && <ol className="react-guide"><li>Chọn Creator và đọc điều kiện áp dụng mã.</li><li>Thêm sản phẩm vào giỏ, kiểm tra khoản giảm.</li><li>Nhập thông tin để tạo đơn mô phỏng, chưa có thanh toán thật.</li></ol>}
      {dialog.kind === 'policy' && <p>{dialog.policy === 'guest' ? 'Luồng mua hàng demo không yêu cầu tài khoản. Thông tin chỉ tồn tại trong phiên hiện tại.' : dialog.policy === 'voucher' ? 'Mỗi đơn demo dùng một mã Creator. Chỉ sản phẩm có liên kết với mã và đủ giá trị tối thiểu mới được giảm.' : 'Thời hạn và điều kiện đổi trả cần lấy từ chính sách gian hàng qua API. Bản demo chưa xử lý yêu cầu đổi trả thật.'}</p>}
      {(dialog.kind === 'terms' || dialog.kind === 'creator') && <div>{dialog.kind === 'creator' && <><h3>{dialog.creator.name}</h3><p>{dialog.creator.bio}</p><p>{dialog.creator.platform} · {dialog.creator.handle}</p></>}<h3>Mã {dialog.creator.coupon}</h3><dl className="react-summary"><div><dt>Mức giảm</dt><dd>{dialog.creator.voucherInfo.discount}</dd></div><div><dt>Tối đa</dt><dd>{dialog.creator.voucherInfo.maxDiscount}</dd></div><div><dt>Đơn từ</dt><dd>{dialog.creator.voucherInfo.minOrder}</dd></div><div><dt>Áp dụng</dt><dd>{dialog.creator.voucherInfo.appliesTo}</dd></div><div><dt>Hạn dùng mẫu</dt><dd>{dialog.creator.voucherInfo.expiry}</dd></div></dl><button className="react-primary" type="button" onClick={() => { setCreatorId(dialog.creator.id); setDialog(null); }}>Chọn ưu đãi</button></div>}
      {dialog.kind === 'product' && <div className="react-product-detail"><img src={dialog.product.image} alt={dialog.product.name} width="320" height="280" /><h3>{dialog.product.name}</h3><p>{dialog.product.brand}</p><strong>{formatMoney(dialog.product.price)}</strong><p>★ {dialog.product.rating} · {dialog.product.reviews} đánh giá mẫu</p><button className="react-primary" type="button" onClick={() => { addProduct(dialog.product); setDialog({ kind: 'cart' }); }}>Thêm vào giỏ</button></div>}
      {dialog.kind === 'video' && <div><h3>{dialog.video.title}</h3><video className="react-video" controls playsInline poster={dialog.video.thumbnail} src="/reference/assets/sample-video.mp4"><track kind="captions" />Trình duyệt không hỗ trợ video.</video><p>Video minh họa từ bản thiết kế, không phải review thật của sản phẩm.</p></div>}
      {(dialog.kind === 'cart' || dialog.kind === 'checkout') && <div>{cart.length === 0 ? <p>Giỏ hàng đang trống. Hãy chọn sản phẩm bạn thích.</p> : <><div className="react-cart-lines">{cart.map(line => { const product = products.find(item => item.id === line.productId); return product ? <div className="react-cart-line" key={line.productId}><img src={product.image} alt="" width="64" height="64" /><div><strong>{product.name}</strong><p>{formatMoney(product.price)}</p><div className="react-quantity"><button type="button" aria-label={`Giảm số lượng ${product.name}`} onClick={() => changeQuantity(product.id, -1)}>−</button><span>{line.quantity}</span><button type="button" aria-label={`Tăng số lượng ${product.name}`} onClick={() => changeQuantity(product.id, 1)}>+</button></div></div></div> : null; })}</div><label htmlFor="cart-creator">Mã Creator</label><select id="cart-creator" value={creatorId} onChange={event => setCreatorId(event.target.value)}>{creators.map(item => <option value={item.id} key={item.id}>{item.coupon} ({item.voucherInfo.discount})</option>)}</select><dl className="react-summary"><div><dt>Tạm tính</dt><dd>{formatMoney(summary.subtotal)}</dd></div><div><dt>Giảm giá đủ điều kiện</dt><dd>−{formatMoney(summary.discount)}</dd></div><div><dt>Tổng demo (chưa phí vận chuyển)</dt><dd><strong>{formatMoney(summary.total)}</strong></dd></div></dl>
        {dialog.kind === 'cart' ? <button type="button" className="react-primary" onClick={() => setDialog({ kind: 'checkout' })}>Tiếp tục đặt hàng demo</button> : <form className="react-checkout" onSubmit={checkout}><p>Chỉ dùng thông tin thử nghiệm. Đây không phải đơn mua hàng thật.</p><label htmlFor="checkout-name">Họ tên</label><input id="checkout-name" name="name" required autoComplete="name" maxLength={100} /><label htmlFor="checkout-phone">Số điện thoại</label><input id="checkout-phone" name="phone" type="tel" required pattern="0[0-9]{9}" autoComplete="tel" /><label htmlFor="checkout-address">Địa chỉ</label><textarea id="checkout-address" name="address" required autoComplete="street-address" maxLength={500} /><button className="react-primary" type="submit">Tạo đơn mô phỏng</button></form>}</>}</div>}
    </Modal>}
  </div>;
}
