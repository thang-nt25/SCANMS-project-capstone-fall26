import type { ReturnDetail } from '../services/return.service';
import type { ReturnCaseFinding } from './return-case-audit';

const escapeHtml = (value: unknown): string => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const formatTime = (value?: string | null): string => {
  if (!value) return 'Chưa ghi nhận';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? escapeHtml(value) : escapeHtml(date.toLocaleString('vi-VN'));
};

const formatMoney = (value: number | string | null | undefined): string =>
  value == null ? 'Chưa ghi nhận' : `${Number(value).toLocaleString('vi-VN')} ₫`;

const safeEvidenceUrl = (value: string): string | null => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
};

const row = (label: string, value: unknown): string =>
  `<div class="row"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value ?? 'Chưa ghi nhận')}</dd></div>`;

const section = (title: string, body: string): string =>
  `<section><h2>${escapeHtml(title)}</h2>${body}</section>`;

const evidence = (urls: string[], title: string): string => {
  if (!urls.length) return `<p class="muted">Chưa có ${escapeHtml(title.toLowerCase())}.</p>`;
  return `<ul class="links">${urls.map((value, index) => {
    const url = safeEvidenceUrl(value);
    return url
      ? `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(title)} ${index + 1}</a><small>${escapeHtml(url)}</small></li>`
      : `<li><span>${escapeHtml(title)} ${index + 1}: liên kết không hợp lệ</span></li>`;
  }).join('')}</ul>`;
};

const shipment = (name: string, value: ReturnDetail['customerShipment']): string =>
  section(name, value ? `<dl>
    ${row('Đơn vị vận chuyển', value.carrierName)}
    ${row('Mã vận đơn', value.trackingNumber)}
    ${row('Trạng thái', value.providerStatus)}
    ${row('Ngày gửi', formatTime(value.shippedAt))}
    ${row('Ngày nhận', formatTime(value.receivedAt))}
    ${row('Phí vận chuyển', formatMoney(value.feeAmount))}
  </dl>${value.receiptImageUrl ? evidence([value.receiptImageUrl], 'Biên nhận') : ''}`
    : '<p class="muted">Chưa phát sinh vận đơn.</p>');

/** Snapshot for review. The report reflects current database state at download time. */
export function buildReturnCaseReport(request: ReturnDetail, generatedAt = new Date(), findings: ReturnCaseFinding[] = []): string {
  const shopEvidence = request.events.flatMap((event) => event.type === 'SHOP_EVIDENCE_SUBMITTED'
    ? event.data?.evidenceUrls ?? [] : []);
  const latestAssessment = [...request.events].reverse().find((event) => event.type === 'LIABILITY_ASSESSED');
  const customerEvidence = [...request.imageUrls, ...(request.unboxingVideoUrl ? [request.unboxingVideoUrl] : [])];
  const timeline = [...request.events].sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const items = request.items.length
    ? `<table><thead><tr><th>Sản phẩm</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>${request.items.map((item) =>
      `<tr><td>${escapeHtml(item.orderItem.product.title)}</td><td>${escapeHtml(item.quantity)}</td><td>${escapeHtml(formatMoney(item.unitPrice))}</td><td>${escapeHtml(formatMoney(Number(item.unitPrice) * item.quantity))}</td></tr>`).join('')}</tbody></table>`
    : '<p class="muted">Không có dòng sản phẩm trong hồ sơ.</p>';

  const events = timeline.length
    ? `<ol class="timeline">${timeline.map((event) => `<li><time>${formatTime(event.createdAt)}</time><strong>${escapeHtml(event.type)}</strong>${event.data ? `<pre>${escapeHtml(JSON.stringify(event.data, null, 2))}</pre>` : ''}</li>`).join('')}</ol>`
    : '<p class="muted">Chưa có sự kiện.</p>';

  const body = [
    section('Điểm cần đối chiếu', findings.length ? `<ul class="findings">${findings.map((finding) =>
      `<li><strong>${escapeHtml(finding.title)}</strong><p>${escapeHtml(finding.detail)}</p></li>`).join('')}</ul>`
      : '<p class="muted">Chưa phát hiện mục cần xử lý thêm tại thời điểm xuất.</p>'),
    section('Thông tin đơn và yêu cầu', `<dl>
      ${row('Mã hồ sơ', request.id)}
      ${row('Mã đơn', request.order.externalOrderSn)}
      ${row('Gian hàng', request.order.storeName)}
      ${row('Khách hàng', request.order.customerName)}
      ${row('Số điện thoại', request.order.customerPhone)}
      ${row('Trạng thái', request.status)}
      ${row('Lý do', request.reason)}
      ${row('Hướng xử lý khách chọn', request.preferredResolution)}
      ${row('Ngày gửi', formatTime(request.submittedAt))}
      ${row('Vận đơn giao ban đầu', request.order.outboundGhnTrackingNumber)}
    </dl><h3>Trình bày của khách</h3><p class="note">${escapeHtml(request.details || 'Không có')}</p>${items}`),
    section('Bằng chứng hai bên', `<h3>Khách hàng</h3>${evidence(customerEvidence, 'Bằng chứng khách')}<h3>Gian hàng</h3><p class="note">${escapeHtml(request.shopResponse || 'Chưa phản hồi')}</p>${evidence(shopEvidence, 'Bằng chứng Shop')}`),
    shipment('Vận đơn khách gửi trả', request.customerShipment),
    shipment('Vận đơn Shop đổi hàng', request.exchangeShipment),
    section('Kiểm tra và trách nhiệm', `<dl>
      ${row('Ngày Shop nhận hàng trả', formatTime(request.receivedAt))}
      ${row('Ngày kiểm tra xong', formatTime(request.inspectionCompletedAt))}
      ${row('Kết quả xử lý', request.resolution)}
      ${row('Bên chịu trách nhiệm', latestAssessment?.data?.liability)}
    </dl><h3>Ghi chú kiểm tra</h3><p class="note">${escapeHtml(request.inspectionNotes || 'Chưa có')}</p><h3>Căn cứ kết luận</h3><p class="note">${escapeHtml(latestAssessment?.data?.notes || 'Chưa có')}</p>`),
    section('Khiếu nại và phân xử', request.dispute ? `<dl>
      ${row('Trạng thái khiếu nại', request.dispute.status)}
      ${row('Lý do', request.dispute.reason)}
      ${row('Quyết định', request.dispute.ruling)}
    </dl><p class="note">${escapeHtml(request.dispute.details)}</p><h3>Ghi chú phân xử</h3><p class="note">${escapeHtml(request.dispute.resolutionNotes || 'Chưa có')}</p>` : '<p class="muted">Chưa phát sinh khiếu nại.</p>'),
    section('Hoàn tiền và thu nhập KOL', `<dl>
      ${row('Phương thức hoàn', request.refund?.method)}
      ${row('Trạng thái hoàn', request.refund?.status)}
      ${row('Số tiền hoàn', formatMoney(request.refund?.amount))}
      ${row('Ngày hoàn xong', formatTime(request.refund?.processedAt))}
      ${row('Thu nhập KOL còn lại', formatMoney(request.partnerIncome?.amount))}
      ${row('Thu nhập đã thu hồi', formatMoney(request.partnerIncome?.reversedAmount))}
    </dl>${request.refund?.failureReason ? `<p class="note danger">${escapeHtml(request.refund.failureReason)}</p>` : ''}`),
    section('Đối soát GHN', request.ghnClaim ? `<dl>
      ${row('Trạng thái yêu cầu', request.ghnClaim.status)}
      ${row('Mã yêu cầu GHN', request.ghnClaim.ghnReference)}
      ${row('Số tiền đề nghị', formatMoney(request.ghnClaim.claimedAmount))}
      ${row('Số tiền GHN chấp thuận', formatMoney(request.ghnClaim.approvedAmount))}
      ${row('Cập nhật lần cuối', formatTime(request.ghnClaim.updatedAt))}
    </dl><p class="note">${escapeHtml(request.ghnClaim.notes || 'Chưa có ghi chú')}</p>${evidence(request.ghnClaim.evidenceUrls, 'Chứng từ GHN')}` : '<p class="muted">Chưa có yêu cầu GHN bồi hoàn.</p>'),
    section('Nhật ký xử lý', events),
  ].join('');

  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>SCANMS - Hồ sơ đổi trả ${escapeHtml(request.order.externalOrderSn)}</title><style>
    :root{font-family:Arial,sans-serif;color:#1A1612;background:#FAF8F5}*{box-sizing:border-box}body{max-width:960px;margin:0 auto;padding:32px}header{border-bottom:3px solid #C59B58;padding-bottom:20px;margin-bottom:24px}h1{font-size:26px;margin:8px 0}h2{font-size:18px;margin:0 0 14px}h3{font-size:14px;margin:18px 0 8px}p{line-height:1.55}.eyebrow{font-size:12px;font-weight:bold;letter-spacing:.12em;color:#B88E4F}.muted,small{color:#7D715E}.meta{display:flex;flex-wrap:wrap;gap:10px 24px;font-size:12px;color:#7D715E}section{background:#fff;border:1px solid #EAE4D7;border-radius:14px;padding:20px;margin:16px 0;break-inside:avoid}dl{margin:0}.row{display:grid;grid-template-columns:210px 1fr;gap:12px;padding:7px 0;border-bottom:1px solid #EAE4D7}.row:last-child{border:0}dt{color:#7D715E}dd{margin:0;font-weight:600;overflow-wrap:anywhere}.note{white-space:pre-wrap;overflow-wrap:anywhere}.danger{color:#DC2626}table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}th,td{padding:9px;text-align:left;border-bottom:1px solid #EAE4D7}th{background:#F3EFE6}.links{padding-left:20px}.links li{margin:8px 0;overflow-wrap:anywhere}.links small{display:block}.links a{color:#8A6736}.timeline{list-style:none;padding:0}.timeline li{border-left:3px solid #EEDFC6;padding:0 0 18px 16px;break-inside:avoid}.timeline time{display:block;font-size:12px;color:#7D715E}.timeline strong{display:block;margin-top:4px}.timeline pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#FAF8F5;border-radius:8px;padding:10px;font-size:11px}footer{font-size:12px;color:#7D715E;margin-top:24px}.print{border:0;border-radius:8px;background:#C59B58;padding:10px 16px;font-weight:bold;cursor:pointer}@media(max-width:600px){body{padding:16px}.row{grid-template-columns:1fr;gap:2px}table{font-size:11px}}@media print{:root{background:#fff}body{max-width:none;padding:0}section{box-shadow:none;break-inside:avoid}.print{display:none}}
  </style></head><body><header><div class="eyebrow">SCANMS · FLOW 4 · HỒ SƠ ĐỐI SOÁT</div><h1>Hồ sơ đổi trả / hoàn tiền</h1><div class="meta"><span>Đơn #${escapeHtml(request.order.externalOrderSn)}</span><span>Xuất lúc ${formatTime(generatedAt.toISOString())}</span><span>Dữ liệu tại thời điểm xuất</span></div></header><button class="print" type="button" onclick="window.print()">In hoặc lưu PDF</button>${body}<footer>Hồ sơ tổng hợp từ dữ liệu SCANMS tại thời điểm xuất. Đối chiếu chứng từ gốc trước khi ra quyết định cuối cùng.</footer></body></html>`;
}

export function downloadReturnCaseReport(request: ReturnDetail, findings: ReturnCaseFinding[] = []): void {
  const html = buildReturnCaseReport(request, new Date(), findings);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `SCANMS-ho-so-${request.order.externalOrderSn.replace(/[^a-zA-Z0-9_-]/g, '_')}.html`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
