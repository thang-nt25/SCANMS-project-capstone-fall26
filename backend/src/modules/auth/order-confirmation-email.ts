export interface OrderConfirmationEmailInput {
  email: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  publicOrderCode: string;
  createdAt: Date | string;
  subtotalAmount: number;
  shippingFee: number;
  discountAmount: number;
  finalAmount: number;
  paymentMethod: string;
  paymentStatus?: string;
  storeName: string;
  items: Array<{ title: string; variantName?: string; sku?: string; quantity: number; unitPrice: number }>;
}

const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]!);
const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

export function renderOrderConfirmationEmail(input: OrderConfirmationEmailInput, webUrl: string) {
  const trackingUrl = `${webUrl.replace(/\/$/, '')}/tracking?sn=${encodeURIComponent(input.publicOrderCode)}`;
  const paid = input.paymentStatus === 'PAID';
  const awaitingPayos = input.paymentMethod === 'PAYOS' && !paid;
  const method = ({ PAYOS: 'Chuyển khoản PayOS', VIETQR: 'VietQR', WALLET: 'Ví SCANMS', COD: 'Thanh toán khi nhận hàng' })[input.paymentMethod] || input.paymentMethod;
  const status = paid ? 'Đã thanh toán' : awaitingPayos ? 'Chờ thanh toán' : 'Chưa thanh toán';
  const createdAt = new Date(input.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hour12: false });
  const heading = awaitingPayos ? 'Đơn hàng chờ thanh toán' : 'Xác nhận đặt hàng';
  const notice = awaitingPayos ? 'Đơn chưa thanh toán. Mở liên kết tra cứu để tiếp tục thanh toán PayOS.' : paid ? 'Thanh toán đã được ghi nhận. Gian hàng sẽ tiếp tục xử lý đơn của bạn.' : input.paymentMethod === 'COD' ? 'Bạn sẽ thanh toán khi nhận hàng.' : 'Theo dõi trạng thái thanh toán qua liên kết tra cứu đơn hàng.';
  const rows = input.items.map(item => `<tr><td style="padding:14px 0;border-bottom:1px solid #EAE4D7;vertical-align:top;word-break:break-word"><strong>${escape(item.title)}</strong>${item.variantName ? `<div style="font-size:12px;color:#7D715E;margin-top:4px">Phân loại: ${escape(item.variantName)}</div>` : ''}${item.sku ? `<div style="font-size:12px;color:#7D715E;margin-top:4px">SKU: ${escape(item.sku)}</div>` : ''}<div style="font-size:12px;color:#7D715E;margin-top:5px">${escape(money(item.unitPrice))} × ${item.quantity}</div></td><td style="padding:14px 0 14px 12px;border-bottom:1px solid #EAE4D7;text-align:right;vertical-align:top;white-space:nowrap;font-weight:600">${escape(money(item.unitPrice * item.quantity))}</td></tr>`).join('');
  const summaryRow = (label: string, value: string) => `<tr><td style="padding:5px 0;color:#7D715E">${label}</td><td style="padding:5px 0;text-align:right">${escape(value)}</td></tr>`;
  const html = `<!doctype html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#FAF8F5;font-family:Arial,sans-serif;color:#1A1612">
  <div style="display:none;max-height:0;overflow:hidden">Đơn ${escape(input.publicOrderCode)} tại ${escape(input.storeName)}. Tổng thanh toán ${escape(money(input.finalAmount))}.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF8F5"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#FFFFFF;border:1px solid #EAE4D7;border-radius:16px"><tr><td style="padding:26px 22px">
  <div style="font-size:24px;font-weight:800">Scan<span style="color:#B88E4F">MS</span></div><div style="font-size:11px;color:#7D715E;margin-top:5px">Sàn thương mại & mạng lưới gian hàng đối tác</div>
  <h1 style="font-size:23px;line-height:1.4;margin:26px 0 10px">${heading}</h1><p style="font-size:14px;line-height:1.7;margin:0;color:#7D715E">Xin chào <strong style="color:#1A1612">${escape(input.customerName)}</strong>, đơn tại <strong style="color:#1A1612">${escape(input.storeName)}</strong> đã được ghi nhận.</p>
  <div style="padding:16px;margin-top:20px;background:#FBF5EB;border:1px solid #EEDFC6;border-radius:10px;font-size:13px;line-height:1.9"><div>Mã đơn hàng: <strong>${escape(input.publicOrderCode)}</strong></div><div>Ngày đặt: ${escape(createdAt)} (giờ Việt Nam)</div><div>Phương thức: <strong>${escape(method)}</strong></div><div>Thanh toán: <strong>${status}</strong></div></div>
  <h2 style="font-size:16px;margin:24px 0 8px">Sản phẩm đã đặt</h2><div style="font-size:12px;color:#7D715E">Gian hàng: ${escape(input.storeName)}</div><table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;line-height:1.6">${rows}</table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;font-size:13px;line-height:1.6">${summaryRow('Tiền hàng', money(input.subtotalAmount))}${summaryRow('Phí vận chuyển', money(input.shippingFee))}${input.discountAmount > 0 ? summaryRow('Giảm giá', `−${money(input.discountAmount)}`) : ''}<tr><td style="padding-top:14px;border-top:1px solid #EAE4D7;font-weight:600">Tổng thanh toán</td><td style="padding-top:14px;border-top:1px solid #EAE4D7;text-align:right;font-size:21px;font-weight:700">${escape(money(input.finalAmount))}</td></tr></table>
  <h2 style="font-size:16px;margin:26px 0 10px">Thông tin nhận hàng</h2><div style="padding:16px;background:#FAF8F5;border:1px solid #EAE4D7;border-radius:10px;font-size:13px;line-height:1.8;word-break:break-word"><strong>${escape(input.customerName)}</strong><div>Số điện thoại: ${escape(input.customerPhone)}</div><div>${escape(input.shippingAddress).replace(/\n/g, '<br>')}</div></div>
  <p style="font-size:13px;color:#7D715E;line-height:1.7;margin:20px 0">${notice}</p><a href="${escape(trackingUrl)}" style="display:inline-block;padding:13px 20px;border:1px solid #EEDFC6;border-radius:9px;background:#FBF5EB;color:#1A1612;text-decoration:none;font-size:14px;font-weight:600">Theo dõi đơn hàng</a>
  <p style="font-size:12px;color:#7D715E;line-height:1.7;margin:22px 0 0">Khi tra cứu trên thiết bị khác, nhập số điện thoại đã dùng để đặt hàng.</p><p style="font-size:11px;color:#7D715E;line-height:1.7;margin:16px 0 0;word-break:break-all">Nếu nút không mở được, truy cập: ${escape(trackingUrl)}</p>
  </td></tr></table></td></tr></table></body></html>`;
  const text = [
    `SCANMS - ${heading}`, `Xin chào ${input.customerName}`, `Gian hàng: ${input.storeName}`, `Mã đơn hàng: ${input.publicOrderCode}`,
    `Ngày đặt: ${createdAt} (giờ Việt Nam)`, `Phương thức: ${method}`, `Thanh toán: ${status}`, '', 'SẢN PHẨM ĐÃ ĐẶT',
    ...input.items.map(item => `${item.title}${item.variantName ? ` | Phân loại: ${item.variantName}` : ''}${item.sku ? ` | SKU: ${item.sku}` : ''}\n${money(item.unitPrice)} × ${item.quantity} = ${money(item.unitPrice * item.quantity)}`),
    '', `Tiền hàng: ${money(input.subtotalAmount)}`, `Phí vận chuyển: ${money(input.shippingFee)}`, ...(input.discountAmount > 0 ? [`Giảm giá: −${money(input.discountAmount)}`] : []), `Tổng thanh toán: ${money(input.finalAmount)}`,
    '', 'THÔNG TIN NHẬN HÀNG', input.customerName, `Số điện thoại: ${input.customerPhone}`, input.shippingAddress, '', notice, `Theo dõi đơn hàng: ${trackingUrl}`,
  ].join('\n');
  return { subject: `[SCANMS] Xác nhận đơn hàng ${input.publicOrderCode}`, html, text };
}
