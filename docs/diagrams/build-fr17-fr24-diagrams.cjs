/**
 * FR-17..FR-24 as implemented in the current working tree, not a proposed design.
 * Run: node docs/diagrams/build-fr17-fr24-diagrams.cjs
 * Produces two editable, uncompressed diagrams.net files. Never connects to a DB.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const BaseDrawing = require('./drawio-monochrome.cjs');
const ROOT = path.resolve(__dirname, '../..');
const C = { ink: '#000000', muted: '#000000', gold: '#000000', line: '#000000', sand: '#FFFFFF', soft: '#FFFFFF', white: '#FFFFFF', danger: '#000000' };

function wrap(text, max = 70) {
  return text.split('\n').flatMap(line => {
    const out = []; let current = '';
    for (const word of line.split(' ')) {
      if (current && (current + ' ' + word).length > max) { out.push(current); current = word; }
      else current += (current ? ' ' : '') + word;
    }
    out.push(current); return out;
  }).join('\n');
}

class Drawing extends BaseDrawing {
  constructor() { super(); this.classBoxes = []; }
  box(v, x, y, w, h, style = '') {
    return super.box(v, x, y, w, h, `fontColor=${C.ink};strokeColor=${C.muted};fontSize=15;${style}`);
  }
  text(v, x, y, w, h = 30, style = '') {
    return this.box(v, x, y, w, h, `text;fillColor=none;strokeColor=none;align=left;verticalAlign=middle;whiteSpace=wrap;${style}`);
  }
  line(p, q, style = '', pts = [], terminal = '') {
    return super.line(p, q, `strokeColor=${C.muted};${style}`, pts, terminal);
  }
  cls(name, attrs, ops, x, y, w = 560) {
    const lineWidth = Math.floor((w - 30) / 8.2);
    attrs = attrs.flatMap(value => wrap(value, lineWidth).split('\n'));
    ops = ops.flatMap(value => wrap(value, lineWidth).split('\n'));
    const ah = attrs.length ? attrs.length * 25 + 16 : 0;
    const oh = ops.length ? ops.length * 25 + 16 : 0;
    const h = 64 + ah + oh;
    const cid = this.box('', x, y, w, h, `fillColor=${C.white};strokeWidth=1.2;`);
    this.box(name, x, y, w, 64, `fillColor=${C.soft};fontStyle=1;align=center;whiteSpace=wrap;`);
    if (ah) this.text(attrs.join('\n'), x + 15, y + 70, w - 30, ah - 10);
    if (oh) {
      this.line([x, y + 64 + ah], [x + w, y + 64 + ah], 'endArrow=none;');
      this.text(ops.join('\n'), x + 15, y + 70 + ah, w - 30, oh - 10);
    }
    const box = { cid, x, y, w, h, name };
    this.classBoxes.push(box);
    return box;
  }
  note(v, x, y, w, h = 72, danger = false) {
    this.box(v, x, y, w, h, `fillColor=${C.soft};strokeColor=${danger ? C.danger : C.gold};align=left;spacing=12;whiteSpace=wrap;fontSize=15;`);
  }
  title(title, subtitle, width) {
    this.text(title, 40, 22, width - 80, 48, 'fontSize=27;fontStyle=1;');
    this.text(subtitle, 40, 78, width - 80, 54, `fontSize=16;fontColor=${C.muted};`);
  }
  page(name, width, height) {
    return super.page(name, width, height, 0);
  }
}

function evidence(entries) {
  return entries.map(([file, symbol]) => {
    const lines = fs.readFileSync(path.join(ROOT, file), 'utf8').split(/\r?\n/);
    const n = symbol ? lines.findIndex(line => line.includes(symbol)) + 1 : 1;
    if (!n) throw new Error(`Evidence anchor missing: ${file} :: ${symbol}`);
    return `${file}:${n}${symbol ? ' — ' + symbol : ''}`;
  });
}

function footer(d, y, width, notes, sources) {
  const body = notes.flatMap(note => wrap(note, Math.floor((width - 120) / 8.3)).split('\n'));
  d.note(body.join('\n'), 40, y, width - 80, body.length * 24 + 28);
  y += body.length * 24 + 46;
  d.text("CODE EVIDENCE - working-tree snapshot, 18 Oct 2026; line numbers may change.", 40, y, width - 80, 28, 'fontStyle=1;');
  y += 34;
  for (const source of evidence(sources)) {
    const text = wrap(source, Math.floor((width - 110) / 7.8));
    const h = text.split('\n').length * 23;
    d.text(text, 40, y, width - 80, h, 'fontSize=14;'); y += h + 6;
  }
  return y + 30;
}

/** UML dependency (dashed), association (solid) or realization (dashed hollow triangle). */
function connect(d, a, b, label = '', type = 'dependency', multiplicities) {
  let p, q, pts = [];
  const overlapX = a.x < b.x + b.w && b.x < a.x + a.w;
  if (!overlapX && Math.abs(a.x - b.x) > 900 && a.y === b.y) {
    p = [a.x + a.w / 2, a.y]; q = [b.x + b.w / 2, b.y];
    pts = [[p[0], a.y - 45], [q[0], a.y - 45]];
  } else if (!overlapX && Math.abs(a.x - b.x) > 900 && a.y !== b.y) {
    const down = b.y > a.y;
    p = [a.x + a.w / 2, down ? a.y + a.h : a.y];
    q = [b.x + b.w / 2, down ? b.y : b.y + b.h];
    const channelY = (p[1] + q[1]) / 2;
    pts = [[p[0], channelY], [q[0], channelY]];
  } else if (overlapX && Math.abs(a.y - b.y) > 500) {
    const rightSide = a.x < 400;
    p = [rightSide ? a.x + a.w : a.x, a.y + a.h / 2];
    q = [rightSide ? b.x + b.w : b.x, b.y + b.h / 2];
    const channelX = p[0] + (rightSide ? 60 : -60);
    pts = [[channelX, p[1]], [channelX, q[1]]];
  } else if (overlapX) {
    const down = b.y > a.y;
    p = [a.x + a.w / 2, down ? a.y + a.h : a.y];
    q = [b.x + b.w / 2, down ? b.y : b.y + b.h];
  } else {
    const right = b.x > a.x;
    p = [right ? a.x + a.w : a.x, a.y + a.h / 2];
    q = [right ? b.x : b.x + b.w, b.y + b.h / 2];
    if (p[1] !== q[1]) {
      const middle = (p[0] + q[0]) / 2;
      pts = [[middle, p[1]], [middle, q[1]]];
    }
  }
  const style = type === 'association' ? 'endArrow=none;' : type === 'realization'
    ? 'endArrow=block;endFill=0;dashed=1;' : 'endArrow=open;endFill=0;dashed=1;';
  const s = [(p[0] - a.x) / a.w, (p[1] - a.y) / a.h];
  const t = [(q[0] - b.x) / b.w, (q[1] - b.y) / b.h];
  const route = [p, ...pts, q];
  for (let i = 1; i < route.length; i++) {
    const [u, v] = [route[i - 1], route[i]];
    for (const box of d.classBoxes.filter(n => n !== a && n !== b)) {
      const intersects = u[0] === v[0]
        ? u[0] > box.x && u[0] < box.x + box.w && Math.max(u[1], v[1]) > box.y && Math.min(u[1], v[1]) < box.y + box.h
        : u[1] === v[1] && u[1] > box.y && u[1] < box.y + box.h && Math.max(u[0], v[0]) > box.x && Math.min(u[0], v[0]) < box.x + box.w;
      if (intersects) throw new Error(`Connector ${a.name} → ${b.name} crosses ${box.name}`);
    }
  }
  d.line(p, q, `${style}exitX=${s[0]};exitY=${s[1]};entryX=${t[0]};entryY=${t[1]};exitPerimeter=0;entryPerimeter=0;`, pts, `source="${a.cid}" target="${b.cid}"`);
  if (label) {
    const vertical = overlapX && pts.length === 0;
    const bent = pts.length > 0;
    const channelX = overlapX && bent ? pts[0][0] : (p[0] + q[0]) / 2;
    const labelX = vertical ? p[0] + 12 : channelX - 55;
    const labelY = vertical ? (p[1] + q[1]) / 2 - 26
      : bent ? (p[1] + q[1]) / 2 - 48 : p[1] - 54;
    d.text(label, labelX, labelY, vertical ? 205 : 110, 46,
      `fontSize=12;align=${vertical ? 'left' : 'center'};fillColor=${C.white};`);
  }
  if (multiplicities) {
    const sourceVertical = p[1] === a.y || p[1] === a.y + a.h;
    const targetVertical = q[1] === b.y || q[1] === b.y + b.h;
    d.text(multiplicities[0], p[0] + (sourceVertical ? 10 : p[0] === a.x ? -62 : 8),
      p[1] + (sourceVertical && p[1] === a.y + a.h ? 4 : -30), 55, 25, 'fontSize=14;');
    d.text(multiplicities[1], q[0] + (targetVertical ? 10 : q[0] === b.x ? -62 : 8),
      q[1] + (targetVertical && q[1] === b.y + b.h ? 4 : -30), 55, 25, 'fontSize=14;');
  }
}

function classPage(spec) {
  const d = new Drawing(), width = 2040, nodes = new Map();
  d.title(spec.title, "Boundary = React component; client = API service object; control = NestJS class; entity = Prisma model. Relevant members only.", width);
  for (const n of spec.nodes) {
    const box = d.cls(n.name, n.attrs || [], n.ops || [], 50 + n.col * 680, 160 + n.row * 430, 560);
    nodes.set(n.id, box);
  }
  for (const [from, to, label, type] of spec.edges || []) connect(d, nodes.get(from), nodes.get(to), label, type);
  const bottom = Math.max(...[...nodes.values()].map(node => node.y + node.h));
  const height = footer(d, bottom + 80, width, spec.notes, spec.sources);
  return d.page(spec.tab, width, height);
}


function domainPage() {
  const d = new Drawing(), width = 2380;
  d.title('FR-17–FR-24 | Domain Class Diagram', "Actual Prisma entities and persisted associations. StoreWallet and PayoutBatch are included because the current implementation uses them.", width);
  const at = (name, attrs, col, row) => d.cls(`«entity» ${name}`, attrs, [], 55 + col * 790, 160 + row * 420, 650);
  const user = at('User', ['id: UUID [PK]; role: UserRole', 'fullName; email; phoneNumber', 'isActive; isDeleted'], 0, 0);
  const store = at('Store', ['id: UUID [PK]; ownerId: UUID [FK → User]', 'name; slug; isDeleted', 'defaultCommissionRate: Decimal'], 1, 0);
  const product = at('Product', ['id: UUID [PK]; storeId: UUID [FK → Store]', 'sku; title; price; stockQuantity', 'moderationStatus; customCommissionRate?'], 2, 0);
  const wallet = at('Wallet', ['id: UUID [PK]', 'collaboratorId: UUID [unique FK → User]', 'availableBalance; pendingBalance: Decimal', 'version: int; updatedAt'], 0, 1);
  const order = at('Order', ['id: UUID [PK]; storeId: UUID [FK]', 'customerId?; attributedCollaboratorId? [FK → User]', 'externalOrderSn; sourcePlatform; sourceUpdatedAt?', 'status; deliveredAt?; completedAt?; refundedAmount', 'subtotalAmount; discountAmount; shippingFee; finalAmount', 'rawPayload: Json?; cancellationToken?', 'unique(storeId, sourcePlatform, externalOrderSn)'], 1, 1);
  const item = at('OrderItem', ['id: UUID [PK]; orderId: UUID [FK → Order]', 'productId: UUID [FK]; variantId?: UUID [FK]', 'quantity; unitPrice: Decimal', 'appliedCommissionRate; calculatedCommissionAmount', 'regularCommissionRate?; regularCommissionAmount?', 'commissionSnapshotAt?: DateTime'], 2, 1);
  const sw = at('StoreWallet', ['id: UUID [PK]; walletId: UUID [FK → Wallet]', 'storeId: UUID [FK → Store]', 'availableBalance; pendingBalance: Decimal; version', 'unique(walletId, storeId)'], 0, 2);
  const com = at('Commission', ['id: UUID [PK]; orderId: UUID [FK → Order]', 'collaboratorId: UUID [FK → User]', 'commissionAmount: Decimal; storeWalletTracked', 'status: PENDING | APPROVED | PAID | REVERSED', 'eligibleAt; availableAt; approvedAt?; reversedAt?', 'unique(orderId, collaboratorId)'], 1, 2);
  const review = at('ProductReview', ['id: UUID [PK]; productId: UUID [FK → Product]', 'orderId?: UUID [FK → Order]', 'rating: int; comment?; images: String[]; video?', 'status; isApproved; reviewedBy?: UUID [scalar]', 'reviewedAt?; rejectionReason?', 'unique(orderId, productId)'], 2, 2);
  const ledger = at('FinancialLedger', ['id: UUID [PK]; walletId: UUID [FK → Wallet]', 'storeId?: UUID [FK → Store]; balanceBucket', 'transactionType; amount: signed Decimal', 'balanceBefore; balanceAfter', 'storeBalanceBefore?; storeBalanceAfter?', 'referenceId?: UUID; referenceType?: String', 'createdAt; APPEND-ONLY'], 0, 3);
  const payout = at('PayoutRequest', ['id: UUID [PK]; collaboratorId: UUID [FK → User]', 'storeId?: UUID [FK → Store]; batchId?: UUID [FK]', 'amount (gross); taxAmount; netAmount: Decimal', 'status: PENDING | PROCESSING | APPROVED | REJECTED', 'bankName?; bankAccountNumber?; bankAccountName?', 'bankRefCode?; proofImagePublicId?; proofImageSha256?', 'approvedById?: UUID [FK → User]; processedAt?'], 1, 3);
  const batch = at('PayoutBatch', ['id: UUID [PK]; storeId: UUID [FK → Store]', 'createdById: UUID [FK → User]', 'createdAt; fileData: Bytes', "Persist the original XLSX bytes for later download"], 2, 3);
  connect(d, user, wallet, '', 'association', ['1', '0..1']);
  connect(d, store, product, '', 'association', ['1', '0..*']);
  connect(d, store, order, '', 'association', ['1', '0..*']);
  connect(d, product, item, '', 'association', ['1', '0..*']);
  connect(d, wallet, sw, '', 'association', ['1', '0..*']);
  connect(d, wallet, ledger, '', 'association', ['1', '0..*']);
  connect(d, order, item, '', 'association', ['1', '0..*']);
  connect(d, order, com, '', 'association', ['1', '0..*']);
  connect(d, product, review, '', 'association', ['1', '0..*']);
  connect(d, payout, batch, '', 'association', ['0..*', '0..1']);
  // Review->Order and Review->Product are kept in fields to avoid crossed lines through classes.
  const height = footer(d, 1850, width, [
    "Additional foreign keys are listed in attributes: Order.customer/attributedCollaborator, ProductReview.order/product, StoreWallet.store, PayoutRequest.collaborator/store/approvedBy, and PayoutBatch.store/createdBy. ProductReview.reviewedBy is a scalar UUID, not a Prisma User relation.",
    "FinancialLedger has Wallet and Store foreign keys, not a StoreWallet foreign key. Reconcile StoreWallet by walletId + storeId. referenceId is a polymorphic business reference to Commission/PayoutRequest, not a database foreign key.",
    "Commission.PAID exists in the schema, but the payout approval path shown here does not set it. A withdrawal is not a one-to-one commission payment. DTO validation enforces ratings from 1 to 5.",
  ], [['backend/prisma/schema.prisma', 'model Order {'], ['backend/prisma/schema.prisma', 'model ProductReview {'], ['backend/prisma/schema.prisma', 'model Commission {'], ['backend/prisma/schema.prisma', 'model Wallet {'], ['backend/prisma/schema.prisma', 'model FinancialLedger {'], ['backend/prisma/schema.prisma', 'model PayoutRequest {']]);
  return d.page("09 - Domain Class Diagram", width, height);
}

const classSpecs = [
  {
    tab: "FR-17 - Order Tracking", title: "FR-17 | Public Order Tracking and GHN Journey",
    nodes: [
      { id: 'ui', name: '«boundary» OrderTrackingPage', col: 0, row: 0, attrs: ['phoneInput; orderSnInput; orders; loading; error'], ops: ['handleSearch(phoneValue?, orderSnValue?)', 'handleOpenReviewModal(order, item)'] },
      { id: 'ctrl', name: '«control» OrdersController', col: 1, row: 0, attrs: ['- ordersService: OrdersService'], ops: ['trackOrder(query: TrackOrderQueryDto, ip)'] },
      { id: 'svc', name: '«control» OrdersService', col: 2, row: 0, attrs: ['- prisma; - cacheService; - configService'], ops: ['checkPublicOrderRateLimit(ip)', 'trackOrderByPhoneOrSn(query)'] },
      { id: 'dto', name: '«DTO» TrackOrderQueryDto', col: 0, row: 1, attrs: ["phone?: string [10-20 characters]", "orderSn?: string [6-100 characters]", "Service requires both fields; DTO fields are optional"] },
      { id: 'cache', name: '«control» CacheService', col: 1, row: 1, ops: ['checkRateLimit(key, max, seconds)', "orders:public:{ip} -> 30 requests / 60 seconds"] },
      { id: 'db', name: '«infrastructure» PrismaService', col: 2, row: 1, ops: ['order.findMany(where phone AND orderSn)', 'include orderItems/product, store, reviews', 'take: 50; createdAt descending'] },
      { id: 'journey', name: '«boundary» GhnTrackingTimeline', col: 0, row: 2, attrs: ['orderCode; environment?: LIVE | TEST', 'tracking; error; busy'], ops: ['useEffect: poll 30s, simulation 5s', 'GET /shipping/ghn/track/:orderCode'] },
      { id: 'ship', name: '«control» ShippingController', col: 1, row: 2, attrs: ['- ghnService: GhnService'], ops: ['trackOrder(orderCode, environment?)'] },
      { id: 'ghn', name: '«control» GhnService', col: 2, row: 2, attrs: ['- prisma: PrismaService; - configService: ConfigService'], ops: ['trackOrder(orderCode, requestedEnvironment?)', '- readTrackingEvidence(…); saveTrackingEvidence(…)'] },
    ], edges: [['ui', 'ctrl', 'GET /orders/track'], ['ctrl', 'svc', "limit + lookup"], ['ui', 'dto', 'build query'], ['svc', 'cache', 'limit IP'], ['svc', 'db', 'read'], ['journey', 'ship', "GHN journey"], ['ship', 'ghn', 'trackOrder']],
    notes: ["Lookup requires both phone and order code. Normalize 0/+84 phone numbers and compare order codes case-insensitively. /orders/track is read-only; the separate GHN tracking GET may persist evidence without changing Order.status.", "Carrier metadata is stored in Order.rawPayload; this path has no separate Shipment entity. A GHN adapter exists; no equivalent automatic GHTK integration was found in the reviewed modules.", "The timeline switch has no dedicated RETURN_REQUESTED/DISPUTED case. The page can open a review modal for DELIVERED, although the review service and backend require COMPLETED."],
    sources: [['frontend/src/pages/public/OrderTrackingPage.tsx', 'const handleSearch ='], ['backend/src/modules/orders/orders.controller.ts', "@Get('track')"], ['backend/src/modules/orders/orders.service.ts', 'async trackOrderByPhoneOrSn'], ['frontend/src/components/shipping/GhnTrackingTimeline.tsx', 'export function GhnTrackingTimeline']],
  },
  {
    tab: "FR-18 - Reviews and Moderation", title: "FR-18 | Authenticated and Public Product Reviews",
    nodes: [
      { id: 'ui', name: '«boundary» VerifiedReviewModal', col: 0, row: 0, attrs: ['order: CustomerOrder; productId; rating', 'comment; images: File[]; submitting'], ops: ['submit(event) → customerService', 'uploadService.uploadImage(file, folder)'] },
      { id: 'ctrl', name: '«control» CustomerController', col: 1, row: 0, attrs: ['- customerService: CustomerService'], ops: ['confirmReceipt(userId, orderId)', 'createVerifiedReview(userId, orderId, dto)'] },
      { id: 'svc', name: '«control» CustomerService', col: 2, row: 0, attrs: ['- prisma: PrismaService'], ops: ['getOrderDetails(userId, orderId)', 'confirmReceipt(userId, orderId)', 'createVerifiedReview(userId, orderId, dto)'] },
      { id: 'public', name: '«boundary» ProductReviewModal', col: 0, row: 1, attrs: ['verified; attachments; comment; rating'], ops: ['verify(); submit(event)'] },
      { id: 'publicctrl', name: '«control» OrdersController', col: 1, row: 1, attrs: ['- ordersService; - reviewMediaService'], ops: ['uploadReviewMedia(orderId, dto, file, ip)', 'addReview(orderId, dto, ip)'] },
      { id: 'orders', name: '«control» OrdersService', col: 2, row: 1, attrs: ['- prisma; - configService'], ops: ['trackOrderByPhoneOrSn(query)', 'addOrderReview(orderId, dto)'] },
      { id: 'client', name: '«client» reviewService', col: 0, row: 2, ops: ['verifyOrder(orderSn, phone)', 'uploadMedia(order, productId, file, …)', "submit(order, payload) [customerPhone omitted]"] },
      { id: 'media', name: '«control» ReviewMediaService', col: 1, row: 2, attrs: ['- prisma; - config; - storage: CloudinaryService'], ops: ['upload(orderId, dto, file)', "Calls verifyReviewToken / validateReviewMedia"] },
      { id: 'db', name: '«infrastructure» PrismaService', col: 2, row: 2, ops: ['productReview.create / update / findFirst', '$transaction(review update + audit)', "order ownership / status / product membership"] },
      { id: 'review', name: '«entity» ProductReview', col: 0, row: 3, attrs: ['productId; orderId?; rating; comment; images; video?', 'status: ReviewStatus; isApproved', 'unique(orderId, productId)'] },
      { id: 'modctrl', name: '«control» ProductsController', col: 1, row: 3, attrs: ['- productsService: ProductsService'], ops: ['listReviewsForModeration(userId, role)', 'moderateReview(userId, role, reviewId, dto)'] },
      { id: 'moderation', name: '«control» ProductsService', col: 2, row: 3, attrs: ['- prisma; - cacheService'], ops: ['listReviewsForModeration(userId, role)', 'moderateReview(userId, role, reviewId, dto)', '- invalidateLandingCache(productId)'] },
    ], edges: [['ui', 'ctrl', 'JWT Customer'], ['ctrl', 'svc', 'ownership + validate'], ['public', 'publicctrl', 'via reviewService'], ['public', 'client', 'calls'], ['publicctrl', 'orders', 'review public'], ['publicctrl', 'media', "optional upload"], ['orders', 'db', 'read/write'], ['media', 'db', 'read'], ['modctrl', 'moderation', "moderate"], ['moderation', 'db', 'tx + audit'], ['moderation', 'review', 'update entity'], ['svc', 'db', 'persist review']],
    notes: ["The authenticated Customer path uses JWT. It requires a COMPLETED order, no returnRequest, a product in that order, and no existing review. Images are optional. New reviews are PENDING/isApproved=false until Shop/Admin moderation.", "The public path supports images up to 5MB, videos up to 50MB and HMAC verification. Its submit contract is inconsistent with the backend; see sequence FR-18B. It is not the same endpoint as authenticated Customer reviews.", "ProductReview.reviewedBy is a scalar UUID. The Customer service checks duplicates before create; the database unique constraint is the final safeguard. No explicit transaction or row lock is present in createVerifiedReview."],
    sources: [['frontend/src/components/customer/VerifiedReviewModal.tsx', 'export function VerifiedReviewModal'], ['backend/src/modules/customer/customer.service.ts', 'async createVerifiedReview'], ['backend/src/modules/orders/orders.service.ts', 'async addOrderReview'], ['frontend/src/services/review.service.ts', 'async submit('], ['backend/src/modules/products/products.service.ts', 'async moderateReview']],
  },
  {
    tab: "FR-19 - External Order Webhooks", title: "FR-19 | Webhook Intake and Normalizer Strategies",
    nodes: [
      { id: 'dto', name: '«DTO» OrderWebhookDto', col: 0, row: 0, attrs: ['source: shopee | tiktok | shopify', 'storeId?: UUID; storeSlug?: string', 'payload: Record<string, unknown>'] },
      { id: 'ctrl', name: '«control» OrdersController', col: 1, row: 0, attrs: ['- ordersService: OrdersService'], ops: ['receiveWebhook(dto, xWebhookSecret?)'] },
      { id: 'svc', name: '«control» OrdersService', col: 2, row: 0, attrs: ['- prisma; - webhookNormalizer; - configService'], ops: ['receiveWebhook(dto, secret?)', '- findWebhookStore(dto); findWebhookOrder(…)', '- resolveWebhookProducts(storeId, normalized)', '- syncWebhookStatus(existing, normalized, payload)'] },
      { id: 'norm', name: '«control» OrderWebhookNormalizerService', col: 0, row: 1, attrs: ['- normalizers: Map<Platform, Normalizer>'], ops: ['normalize(platform, payload): NormalizedExternalOrder'] },
      { id: 'interface', name: '«interface» ExternalOrderNormalizer', col: 1, row: 1, attrs: ['+ readonly platform: ExternalOrderPlatform'], ops: ['normalize(payload): NormalizedExternalOrder'] },
      { id: 'db', name: '«infrastructure» PrismaService', col: 2, row: 1, ops: ['store/product/order.find…', '$transaction(create order + nested items)', 'SELECT orders … FOR UPDATE [sync]'] },
      { id: 'shopee', name: '«control» ShopeeOrderNormalizer', col: 0, row: 2, attrs: ['readonly platform'], ops: ['normalize(payload)'] },
      { id: 'tiktok', name: '«control» TikTokOrderNormalizer', col: 1, row: 2, attrs: ['readonly platform'], ops: ['normalize(payload)'] },
      { id: 'shopify', name: '«control» ShopifyOrderNormalizer', col: 2, row: 2, attrs: ['readonly platform'], ops: ['normalize(payload)'] },
    ], edges: [['dto', 'ctrl', 'body + header'], ['ctrl', 'svc', 'receive'], ['svc', 'db', 'persist / lock'], ['svc', 'norm', 'normalize'], ['norm', 'interface', 'registry'], ['shopee', 'interface', '', 'realization'], ['tiktok', 'interface', '', 'realization'], ['shopify', 'interface', '', 'realization']],
    notes: ["OrdersService calls OrderWebhookNormalizerService.normalize. ORDER_WEBHOOK_SECRETS maps storeId:source to a timing-safe shared secret. This is not JWT authentication or automatic marketplace OAuth.", "Idempotency uses unique(storeId, sourcePlatform, externalOrderSn). A duplicate without a timestamp is unchanged. Only a newer eventAt may update status under a row lock and transition validation; backward transitions are rejected.", "The transaction creates Order and OrderItems with zero commission placeholders. Webhook intake does not decrement stock, credit wallets or create commissions. It does not infer attributedCollaboratorId."],
    sources: [['backend/src/modules/orders/orders.service.ts', 'async receiveWebhook'], ['backend/src/modules/orders/orders.service.ts', 'private async syncWebhookStatus'], ['backend/src/modules/orders/order-security.utils.ts', 'export function verifyWebhookSecret'], ['backend/src/modules/orders/normalizers/order-webhook-normalizer.service.ts', 'export class OrderWebhookNormalizerService']],
  },
  {
    tab: "FR-20 - Manual Orders and Excel", title: "FR-20 | Manual Order Creation and Per-Order Excel Import",
    nodes: [
      { id: 'ui', name: '«boundary» OrdersManagementPage', col: 0, row: 0, attrs: ['items; products; customer; discount; file; result', 'requestId: ref; inFlight; notice'], ops: ['submitManual(event); applyDiscount()', 'importExcel(); selectFile(file)'] },
      { id: 'ctrl', name: '«control» OrdersController', col: 1, row: 0, attrs: ['- manualOrdersService; - excelOrderImportService'], ops: ['createManualOrder(manager, dto)', 'importExcelOrders(manager, dto, file)', 'quoteManualDiscount(manager, dto)', 'downloadOrderTemplate(response)'] },
      { id: 'manual', name: '«control» ManualOrdersService', col: 2, row: 0, attrs: ['- prisma; - couponsService'], ops: ['resolveManagedStore(manager, storeId?)', 'createManualOrder(manager, dto)', 'createManualOrderForStore(storeId, dto)', 'quoteDiscount(manager, dto)'] },
      { id: 'client', name: '«client» orderService', col: 0, row: 1, ops: ['createManualOrder(data)', 'quoteDiscount(data); importExcel(file, storeId?)', 'downloadExcelTemplate(); getMyStoreOrders(…)'] },
      { id: 'excel', name: '«control» ExcelOrderImportService', col: 1, row: 1, attrs: ['- manualOrdersService: ManualOrdersService'], ops: ['importOrders(manager, dto, file)', 'createTemplate(): Promise<Buffer>', '- loadWorkbook(); parseRow(); groupRowsByOrder()'] },
      { id: 'db', name: '«infrastructure» PrismaService', col: 2, row: 1, ops: ['$transaction(callback, timeout: 30000)', 'Lock products / optional coupon FOR UPDATE', 'Create Order + OrderItems + coupon redemption'] },
      { id: 'dto', name: '«DTO» CreateManualOrderDto', col: 0, row: 2, attrs: ['storeId?; requestId?; externalOrderSn?', 'customer / name, phone, shippingAddress', 'items: productId? / sku, quantity, unitPrice?', 'discountAmount?; discountCode?; shippingFee?', 'status?; paymentMethod?; totalAmount?; note?'] },
      { id: 'parser', name: '«library» ExcelJS.Workbook', col: 1, row: 2, ops: ['xlsx.load(buffer); worksheet.getRow(n)', "XLSX: <=5MB; <=10,000 data rows", "Group rows sharing the same order_code"] },
      { id: 'coupon', name: '«control» CouponsService', col: 2, row: 2, ops: ["validateCoupon(...) [preview outside transaction]", "Inside tx: lock and recheck version/quota"] },
    ], edges: [['ui', 'ctrl', 'via orderService'], ['ctrl', 'manual', 'manual'], ['ui', 'client', 'calls'], ['ctrl', 'excel', 'import'], ['excel', 'manual', "one group = one order"], ['manual', 'db', 'atomic per order'], ['excel', 'parser', 'parse XLSX'], ['manual', 'coupon', 'optional coupon']],
    notes: ["Shop/Admin/Manager must pass JWT, RolesGuard and resolveManagedStore. The backend validates recipient details, SKU, quantities, prices and totals. A Shop cannot create orders for another Shop.", "Excel import is not one transaction for the whole file. Failed orders produce row-level errors while other valid orders may commit. No ImportJob/ImportBatch entity is created.", "Manual/import paths reconcile orders: they lock and check quantities but do not reserve/decrement stock or create GHN shipments, quotes, commissions or wallet credits. Manual shippingFee is an input, not a dynamic checkout quote.", "requestId replay is supported only without a custom externalOrderSn; a different fingerprint returns 409. Manual/webhook intake does not assign attributedCollaboratorId, so FR-21 requires valid attribution from another path."],
    sources: [['frontend/src/pages/merchant/OrdersManagementPage.tsx', 'async function submitManual'], ['backend/src/modules/orders/manual-orders.service.ts', 'async createManualOrderForStore'], ['backend/src/modules/orders/excel-order-import.service.ts', 'async importOrders'], ['backend/src/modules/orders/orders.controller.ts', "@Post('import-excel')"]],
  },
  {
    tab: "FR-21 - Commissions and Escrow", title: "FR-21 | Commission Engine, Adaptive Escrow and Clawback",
    nodes: [
      { id: 'job', name: '«control» CommissionSchedulerService', col: 0, row: 0, attrs: ['- commissionsService: CommissionsService'], ops: ['reconcileCommissionBalances()', '@Cron EVERY_MINUTE, waitForCompletion=true'] },
      { id: 'svc', name: '«control» CommissionsService', col: 1, row: 0, attrs: ['- prisma; - calculator; - walletsService'], ops: ['reconcileCommissions(now?)', 'createPendingCommission(orderId, now?)', 'approveMatureCommission(commissionId, now?)', 'reverseCommission(commissionId, now?)', 'getOrderEscrowDetails(orderId)'] },
      { id: 'wallet', name: '«control» WalletsService', col: 2, row: 0, ops: ['creditPendingBalance(tx, user, amount, ref, shop)', 'releasePendingBalance(tx, user, amount, ref, shop)', 'reversePendingBalance(tx, …)', 'reverseAvailableBalance(tx, …)'] },
      { id: 'calc', name: '«control» CommissionCalculatorService', col: 0, row: 1, ops: ['calculateOrderCommission(items, defaultRate,', '  tierBonusRate, discountAmount?)', '→ items[] + totalCommissionAmount'] },
      { id: 'db', name: '«infrastructure» PrismaService', col: 1, row: 1, ops: ['$transaction(callback)', 'Lock Order → Commission → Wallet → StoreWallet', 'commission / orderItem / wallet / ledger writes'] },
      { id: 'policy', name: '«functions» commission-policy / holidays', col: 2, row: 1, ops: ['additiveCommissionRate(tier, deal, campaign, live)', 'tierBonusByName(name)', 'calculateAdaptiveEscrowReleaseDate(start, 14)'] },
      { id: 'order', name: '«control» OrdersService [checkout]', col: 0, row: 2, ops: ['executeStoreOrderInTransaction(tx, …)', "Snapshot rate/amount for each OrderItem", 'Base 10 + tier + deal + campaign + live, cap 25'] },
      { id: 'commission', name: '«entity» Commission', col: 1, row: 2, attrs: ['orderId; collaboratorId; commissionAmount', 'eligibleAt; availableAt; approvedAt?; reversedAt?', 'status; storeWalletTracked', 'unique(orderId, collaboratorId)'] },
      { id: 'ui', name: '«boundary» WalletPage', col: 2, row: 2, attrs: ['wallet; escrowPolicy; loading'], ops: ['loadWallet() → walletService + escrow-info'] },
      { id: 'ctrl', name: '«control» CommissionsController', col: 0, row: 3, attrs: ['- commissionsService: CommissionsService'], ops: ['getEscrowPolicyInfo(sampleDate?)', 'getOrderEscrowDetails(orderId)'] },
    ], edges: [['job', 'svc', "every minute"], ['svc', 'wallet', "same transaction"], ['svc', 'db', 'locks + persistence'], ['db', 'commission', 'persist'], ['svc', 'calc', 'calculate'], ['svc', 'policy', 'escrow / tier'], ['ctrl', 'svc', "read escrow"], ['order', 'policy', 'additive rate']],
    notes: ["The calculator preserves existing commission snapshots rather than applying current prices or tiers to historical orders. Without a snapshot, it uses base 10% + tier 0-3%, allocates discount/refund effects and rounds item commissions to two decimals.", "Creation requires a DELIVERED/COMPLETED order, an active attributed KOL and no existing commission. eligibleAt uses completedAt ?? updatedAt, not createdAt. availableAt counts 14 days excluding configured holidays.", "Cron runs reversal, creation, then approval, up to 100 candidates per stage. DISABLE_SCHEDULED_JOBS=true skips execution. Approval is not a KOL-triggered endpoint.", "Clawback removes PENDING commissions from pending funds and APPROVED commissions from available funds, potentially creating recoverable debt. RETURN_REQUESTED/DISPUTED are not approved or reversed; CANCELLED/RETURNED trigger reversal."],
    sources: [['backend/src/modules/commissions/commission-scheduler.service.ts', '@Cron'], ['backend/src/modules/commissions/commissions.service.ts', 'async reconcileCommissions'], ['backend/src/modules/commissions/commission-calculator.service.ts', 'calculateOrderCommission('], ['backend/src/modules/orders/orders.service.ts', 'const finalCommissionRate'], ['backend/src/modules/commissions/utils/vietnam-holidays.util.ts', 'export function calculateAdaptiveEscrowReleaseDate']],
  },
  {
    tab: "FR-22 - Row-Locked Withdrawals", title: "FR-22 | Withdrawals with Global and Store Wallet Locks",
    nodes: [
      { id: 'ui', name: '«boundary» WalletPage', col: 0, row: 0, attrs: ['wallet; storeId; amount: string; history; ledger', 'submissionInFlight; submitting; error'], ops: ['handleWithdrawal(event); loadWallet()'] },
      { id: 'ctrl', name: '«control» PayoutsController', col: 1, row: 0, attrs: ['- payoutsService: PayoutsService'], ops: ['createWithdrawal(user, dto)', 'getMyWithdrawals(user, query)'] },
      { id: 'svc', name: '«control» PayoutsService', col: 2, row: 0, attrs: ['- prisma; - walletsService; - policy; - taxService'], ops: ['createWithdrawal(collaboratorId, dto)', 'getMyWithdrawals(collaboratorId, query)'] },
      { id: 'dto', name: '«DTO» CreateWithdrawalDto', col: 0, row: 1, attrs: ["amount: string [<=13 digits; <=2 decimal places]", 'storeId: UUID v4', "No client-controlled userId, tax or status"] },
      { id: 'wallet', name: '«control» WalletsService', col: 1, row: 1, attrs: ['- ledgerService: FinancialLedgerService'], ops: ['debitAvailableBalanceForWithdrawal(tx, …)', '- lockWallet(tx, collaboratorId)', '- lockStoreWallet(tx, walletId, storeId)', '- applyBalanceChanges(tx, …)'] },
      { id: 'policy', name: '«control» WithdrawalPolicyService', col: 2, row: 1, attrs: ['minimumAmount: Decimal [default 200.000]', "MIN_PAYOUT_AMOUNT from ConfigService"] },
      { id: 'summary', name: '«control» WalletSummaryService', col: 0, row: 2, ops: ['getMyWallet(collaboratorId)', 'getMyLedger(collaboratorId, query)', 'updateBankAccount(…); disconnectBankAccount(…)'] },
      { id: 'db', name: '«infrastructure» PrismaService', col: 1, row: 2, ops: ['$transaction: profile/store → wallet debit → payout', "SELECT wallets FOR UPDATE, then read balance", "SELECT store_wallets FOR UPDATE, then read balance", "UPDATE both wallets + INSERT ledger + INSERT payout"] },
      { id: 'request', name: '«entity» PayoutRequest', col: 2, row: 2, attrs: ["collaboratorId; storeId? [required by current service]", 'amount; taxAmount; netAmount; bank snapshot', 'status = PENDING; createdAt'] },
      { id: 'tax', name: '«control» PayoutTaxService', col: 2, row: 3, ops: ['calculateTax(gross): { taxAmount, netAmount }'] },
      { id: 'client', name: '«client» walletService', col: 0, row: 3, ops: ['createWithdrawal(amount, storeId)', 'getMyWallet(); getMyLedger(page)', 'getMyWithdrawals(page)'] },
    ], edges: [['ui', 'ctrl', 'via walletService'], ['ctrl', 'svc', 'JWT KOL'], ['ui', 'dto', 'validated body'], ['ui', 'client', 'calls'], ['svc', 'wallet', 'same tx'], ['svc', 'policy', 'minimum'], ['svc', 'tax', "tax snapshot"], ['wallet', 'db', "lock, then read"], ['db', 'request', 'create PENDING']],
    notes: ["The server takes collaboratorId from JWT and requires an active COLLABORATOR, VERIFIED KYC and complete bank details. Only funds allocated to the selected Shop can be withdrawn. Insufficient Shop funds roll back even if the global balance is sufficient.", "Gross is debited once when the request is created. Tax is withheld within gross, not charged again. Approval does not debit again. Any debit/ledger/payout failure rolls back the transaction.", "Row locks prevent concurrent over-withdrawal, but do not make two valid submissions idempotent. The UI has an in-flight guard; the withdrawal backend has no separate requestId/idempotencyKey."],
    sources: [['frontend/src/pages/collaborator/WalletPage.tsx', 'async function handleWithdrawal'], ['backend/src/modules/payouts/payouts.controller.ts', "@Controller('wallets/withdrawals')"], ['backend/src/modules/payouts/payouts.service.ts', 'async createWithdrawal'], ['backend/src/modules/wallets/wallets.service.ts', 'private async lockWallet'], ['backend/src/modules/wallets/wallets.service.ts', 'private async lockStoreWallet']],
  },
  {
    tab: "FR-23 - Ledger and Withholding Tax", title: "FR-23 | Append-Only Ledger and Per-Request Tax Snapshot",
    nodes: [
      { id: 'payout', name: '«control» PayoutsService', col: 0, row: 0, ops: ['createWithdrawal(userId, dto)', "Persist gross/tax/net in PayoutRequest"] },
      { id: 'tax', name: '«control» PayoutTaxService', col: 1, row: 0, ops: ['calculateTax(grossAmount: Decimal)', 'gross ≥ 2.000.000 → 10% gross', 'ROUND_HALF_UP, scale 2; else tax = 0'] },
      { id: 'wallet', name: '«control» WalletsService', col: 2, row: 0, ops: ['applyBalanceChanges(tx, wallet, ref, changes, store?)', 'UPDATE balances + version; append ledger'] },
      { id: 'ref', name: '«interface» LedgerReference', col: 0, row: 1, attrs: ['id: string; type: string', "Polymorphic business reference, not a foreign key"] },
      { id: 'ledger', name: '«control» FinancialLedgerService', col: 1, row: 1, ops: ['appendEntry(tx, walletId, ref, change, store?)', 'Assert after = before + signed amount', "No update/delete API"] },
      { id: 'db', name: '«database rule» PostgreSQL', col: 2, row: 1, attrs: ['CHECK amount ≠ 0, after = before + amount', 'UNIQUE(wallet,bucket,referenceId,transactionType)', 'FK wallet ON DELETE RESTRICT'], ops: ['reject_financial_ledger_mutation()', 'BEFORE UPDATE / DELETE / TRUNCATE → error'] },
      { id: 'ui', name: '«boundary» WalletPage', col: 0, row: 2, attrs: ['wallet.withdrawalTaxPolicy; ledger', "Preview uses BigInt minor units"], ops: ["loadWallet() -> fetch tax policy and ledger"] },
      { id: 'row', name: '«entity» FinancialLedger', col: 1, row: 2, attrs: ['walletId; storeId?; bucket; transactionType', 'amount; before; after; storeBefore?; storeAfter?', 'referenceId?; referenceType?; createdAt'] },
      { id: 'req', name: '«entity» PayoutRequest', col: 2, row: 2, attrs: ['amount (gross); taxAmount; netAmount', "Historical snapshot is not recalculated", "No separate TAX_WITHHOLD ledger entry"] },
      { id: 'ctrl', name: '«control» WalletsController', col: 0, row: 3, attrs: ['- summaryService: WalletSummaryService'], ops: ['getMyWallet(user); getMyLedger(user, query)'] },
      { id: 'summary', name: '«control» WalletSummaryService', col: 1, row: 3, attrs: ['- prisma; - policy'], ops: ['getMyWallet(collaboratorId)', 'getMyLedger(collaboratorId, query)'] },
      { id: 'change', name: '«interface» LedgerBalanceChange', col: 2, row: 3, attrs: ['bucket: WalletBalanceBucket', 'transactionType: TransactionType', 'amount; balanceBefore; balanceAfter: Decimal'] },
    ], edges: [['payout', 'tax', "before transaction"], ['wallet', 'ledger', "same tx"], ['ledger', 'db', 'INSERT only'], ['ledger', 'row', 'create'], ['payout', 'ref', 'PAYOUT_REQUEST ref'], ['ctrl', 'summary', 'read-only history'], ['ui', 'ctrl', 'via walletService']],
    notes: ["Example: gross 1,999,999 -> tax 0; gross 2,000,000 -> tax 200,000 and net 1,800,000. The threshold applies per request, not cumulatively per month. This is the project's FR-23 rule.", "The service and database triggers enforce append-only behavior for UPDATE/DELETE/TRUNCATE. Corrections use new entries, never edits to existing rows. This is not a mandatory double-entry accounting system: escrow release writes two balance-bucket entries; withdrawal writes one negative gross entry.", "All writes use the caller's Prisma transaction client. Invariant, uniqueness or trigger failures roll back balances and payout creation together. No REST endpoint edits the ledger."],
    sources: [['backend/src/modules/payouts/payout-tax.service.ts', 'calculateTax('], ['backend/src/modules/wallets/financial-ledger.service.ts', 'appendEntry('], ['backend/src/modules/wallets/wallets.service.ts', 'private async applyBalanceChanges'], ['backend/prisma/migrations/20260912200000_fr23_immutable_ledger/migration.sql', 'CREATE FUNCTION']],
  },
  {
    tab: "FR-24 - Payouts and VietQR", title: "FR-24 | Receipt Approval, Rejection and VietQR Batches",
    nodes: [
      { id: 'ui', name: '«boundary» PayoutApprovalPage', col: 0, row: 0, attrs: ['storeId; history; batches; dialog; bill; bankRefCode'], ops: ['load(); submitDialog(event); openBill(request)', 'handleExportExcel()'] },
      { id: 'ctrl', name: '«control» PayoutApprovalController', col: 1, row: 0, attrs: ['- prisma; - payouts: MerchantPayoutsService'], ops: ['approve(payoutId, user, dto, bill)', "POST /payouts/:payoutId/approve [current web]"] },
      { id: 'svc', name: '«control» MerchantPayoutsService', col: 2, row: 0, attrs: ['- prisma; - wallets; - bills'], ops: ['assertStoreOwnership(…); assertFundedPayout(…)', 'approvePayout(…); rejectPayout(…)', 'listPayouts(…); getBill(…); lockPayout(…)'] },
      { id: 'scope', name: '«control» MerchantPayoutsController', col: 0, row: 1, attrs: ['- payouts; - batches'], ops: ['list(); approve() [PATCH legacy]; reject()', 'bill(); listBatches(); exportBatch()', 'downloadBatch(); sendWorkbook(response, file)'] },
      { id: 'bill', name: '«control» PayoutBillService', col: 1, row: 1, attrs: ['- settings: PayoutSettingsService'], ops: ['validateBill(file): sha256; uploadBill(file)', 'getBillDownloadUrl(publicId, format) [120s]', 'removeUnusedBill(publicId)'] },
      { id: 'db', name: '«infrastructure» PrismaService', col: 2, row: 1, ops: ['Lock payout row(s) FOR UPDATE', 'UPDATE payout + INSERT AuditLog in same tx', 'PayoutBatch.fileData stores exact XLSX bytes'] },
      { id: 'batch', name: '«control» PayoutBatchesService', col: 0, row: 2, attrs: ['- prisma; - payouts; - settings'], ops: ['exportBatch(storeId, userId, dto)', 'buildWorkbook(batch, requests)', 'downloadBatch(…); listBatches(…)'] },
      { id: 'settings', name: '«control» PayoutSettingsService', col: 1, row: 2, attrs: ['qrBaseUrl; qrTemplate; billFolder; maxBillBytes'], ops: ['resolveBank(bankName): VietQrBank'] },
      { id: 'cloud', name: '«external SDK» Cloudinary', col: 2, row: 2, ops: ['upload_stream(type=authenticated)', 'private_download_url(expires_at)', 'destroy(unused publicId)'] },
      { id: 'client', name: '«client» payoutService', col: 0, row: 3, ops: ['list(…); batches(…); approve(…); reject(…)', 'bill(…); exportBatch(…); downloadBatch(…)'] },
    ], edges: [['ui', 'ctrl', 'bill + note + ref?'], ['ui', 'client', 'calls'], ['ctrl', 'svc', 'owned payout'], ['svc', 'db', 'tx status + audit'], ['svc', 'bill', 'validate/upload'], ['scope', 'batch', 'export / download'], ['batch', 'settings', 'bank / QR config'], ['bill', 'cloud', 'private storage']],
    notes: ["The current web uses POST approval: a bill is required; the FE accepts PNG/JPG/PDF <=5MB and the BE also accepts WEBP. note and bankRefCode are optional. The legacy scoped PATCH approval route still requires bankRefCode.", "Approval requires PENDING/PROCESSING, a matching funded debit ledger and valid tax/net snapshots. It records APPROVED + AuditLog without another wallet debit or bank transfer API call. Private bill hashes and bank references prevent reuse. Upload precedes the transaction; unlinked uploads are cleaned up on failure.", "Export locks 1-200 PENDING payouts without a batch, validates funding, generates an XLSX using net amounts, persists the bytes and PayoutBatch, and marks payouts PROCESSING. It is a reconciliation workbook with VietQR Quick Links, not a transfer API or universal bank import format.", "Rejection is allowed only for PENDING requests not in a batch. One transaction refunds gross to the correct global/Shop wallets, appends PAYOUT_REJECT_REFUND and records REJECTED + audit. PROCESSING requests need reconciliation, not automatic refunds."],
    sources: [['frontend/src/services/payout.service.ts', 'async approve('], ['backend/src/modules/payouts/payout-approval.controller.ts', "@Post(':payoutId/approve')"], ['backend/src/modules/payouts/merchant-payouts.service.ts', 'async approvePayout'], ['backend/src/modules/payouts/payout-batches.service.ts', 'async exportBatch'], ['backend/src/modules/payouts/payout-bill.service.ts', 'validateBill(']],
  },
];

const classPages = [...classSpecs.map(classPage), domainPage()];
BaseDrawing.save(path.join(__dirname, 'FR17_FR24_Class_Diagram.drawio'), classPages);
console.log(`Class diagram generated: ${classPages.length} pages.`);

// Sequence definitions follow below; class file is deliberately generated first.
const M = (from, to, text) => ({ kind: 'message', from, to, text });
const R = (from, to, text) => ({ ...M(from, to, text), reply: true });
const N = (text, danger = false) => ({ kind: 'note', text, danger });
const F = (type, label) => ({ kind: 'begin', type, label });
const E = () => ({ kind: 'end' });
const A = label => ({ kind: 'else', label });

function sequencePage(spec) {
  const d = new Drawing();
  const gap = 350, xs = spec.lanes.map((_, i) => 180 + i * gap);
  const width = xs.at(-1) + 330, rowTop = 245;
  const positioned = [], frames = [], stack = [];
  let y = rowTop, sequenceNumber = 0;
  for (const action of spec.actions) {
    if (action.kind === 'begin') {
      const frame = { top: y, type: action.type, label: action.label, branches: [], depth: stack.length };
      stack.push(frame); y += 56;
    } else if (action.kind === 'end') {
      const frame = stack.pop();
      if (!frame) throw new Error(`Unbalanced frame: ${spec.tab}`);
      frame.bottom = y + 16; frames.push(frame); y += 42;
    } else if (action.kind === 'else') {
      if (!stack.length) throw new Error(`Else without frame: ${spec.tab}`);
      stack.at(-1).branches.push({ y, label: action.label }); y += 58;
    } else if (action.kind === 'note') {
      const text = wrap(action.text, Math.floor((width - 140) / 8.3));
      const h = text.split('\n').length * 24 + 26;
      positioned.push({ ...action, y, text, h }); y += h + 24;
    } else {
      if (!Number.isInteger(action.from) || !Number.isInteger(action.to) || !spec.lanes[action.from] || !spec.lanes[action.to])
        throw new Error(`Invalid lifeline: ${spec.tab}`);
      const available = action.from === action.to ? 260 : Math.abs(xs[action.from] - xs[action.to]) - 34;
      const text = wrap(`${++sequenceNumber}. ${action.text}`, Math.max(23, Math.floor(available / 7.5)));
      const h = text.split('\n').length * 21 + 10;
      positioned.push({ ...action, y: y + h, text, h }); y += h + 45;
    }
  }
  if (stack.length) throw new Error(`Unclosed frame: ${spec.tab}`);
  d.title(spec.title, spec.subtitle || "As implemented: FE -> controller -> service -> Prisma/PostgreSQL. Solid arrows are calls; dashed arrows are replies. alt/opt/loop frames follow actual code conditions.", width);
  // Combined fragments are drawn first, behind lifelines and message labels.
  for (const frame of frames.sort((a, b) => a.depth - b.depth)) {
    const x = 40 + frame.depth * 10, w = width - 80 - frame.depth * 20;
    d.box('', x, frame.top, w, frame.bottom - frame.top, 'fillColor=none;strokeWidth=1.1;');
    d.box(frame.type, x, frame.top, 100, 36, `fillColor=${C.sand};align=center;fontStyle=1;`);
    d.text(wrap(`[${frame.label}]`, Math.floor((w - 140) / 8)), x + 115, frame.top + 2, w - 135, 44, 'fontStyle=1;fontSize=14;');
    for (const branch of frame.branches) {
      d.line([x, branch.y], [x + w, branch.y], 'endArrow=none;dashed=1;');
      d.text(`[else: ${branch.label}]`, x + 15, branch.y + 5, w - 30, 40, 'fontSize=14;fontStyle=1;');
    }
  }
  xs.forEach((x, i) => {
    d.line([x, 222], [x, y + 8], 'endArrow=none;dashed=1;dashPattern=4 4;');
    const laneText = wrap(spec.lanes[i], 29);
    d.box(laneText, x - 142, 150, 284, 72, `fillColor=${C.soft};align=center;fontStyle=1;whiteSpace=wrap;`);
  });
  for (const action of positioned) {
    if (action.kind === 'note') {
      d.note(action.text, 60, action.y, width - 120, action.h, action.danger); continue;
    }
    const from = xs[action.from], to = xs[action.to];
    const style = `endArrow=${action.reply ? 'open' : 'block'};endFill=${action.reply ? '0' : '1'};${action.reply ? 'dashed=1;' : ''}`;
    if (from === to) {
      d.line([from + 6, action.y], [from + 6, action.y + 18], style, [[from + 45, action.y], [from + 45, action.y + 18]]);
      d.text(action.text, from + 58, action.y - action.h, 260, action.h, `fontSize=14;fillColor=${C.white};`);
    } else {
      const targetOffset = action.to > action.from ? -6 : 6;
      if (!action.reply && action.to !== 0)
        d.box('', to - 5, action.y - 7, 10, 27, `fillColor=${C.sand};`);
      d.line([from, action.y], [to + targetOffset, action.y], style);
      d.text(action.text, Math.min(from, to) + 14, action.y - action.h, Math.abs(from - to) - 28, action.h - 4, `fontSize=14;align=center;fillColor=${C.white};`);
    }
  }
  const height = footer(d, y + 40, width, spec.notes, spec.sources);
  return d.page(spec.tab, width, height);
}

const sequences = [
  {
    tab: "FR-17 - Public Order Lookup", title: "FR-17 | Phone and Order Code Lookup",
    lanes: ["Customer", '«boundary» OrderTrackingPage', '«controller» OrdersController', '«service» OrdersService', '«service» CacheService', '«database» Prisma / PostgreSQL'],
    actions: [
      M(0, 1, "Enter phone and order code; search"),
      F('alt', "phone or orderSn missing"), R(1, 0, "Require both fields; do not call API"),
      A("Both fields provided"), M(1, 2, 'GET /api/orders/track?phone=…&orderSn=…'),
      M(2, 3, 'checkPublicOrderRateLimit(ip)'), M(3, 4, 'checkRateLimit(orders:public:ip, 30, 60)'),
      F('alt', "Rate limit exceeded"), R(4, 3, 'allowed=false'), R(3, 1, "HTTP 429; display error"),
      A("Request allowed"), M(2, 3, 'trackOrderByPhoneOrSn(query)'),
      M(3, 3, "Require both fields; normalize phone; case-insensitive code"),
      M(3, 5, 'findMany: phone AND externalOrderSn; include items/store/reviews'),
      R(5, 3, "Matching orders, at most 50"),
      M(3, 3, "Map status/timeline and rawPayload; issue HMAC reviewToken"),
      R(3, 2, '{totalFound, orders[]}'), R(2, 1, 'HTTP 200; envelope data'),
      F('alt', "No matching orders"), R(1, 0, "Display no matching order"),
      A("Orders found"), R(1, 0, "Display order, items, status and tracking code"), E(), E(), E(),
      N("opt [GHN code present]: GhnTrackingTimeline calls GET /api/shipping/ghn/track/:code through ShippingController -> GhnService. Poll every 30s (5s for simulation) until terminal. Errors/stale data keep a warning; the UI never invents delivery confirmation."),
    ],
    notes: ["/orders/track requires phone + order code, not JWT, and does not write orders/commissions. The separate GHN journey GET may store evidence. Legacy GHTK wording does not imply an automatic GHTK adapter.", "The timeline switch lacks RETURN_REQUESTED/DISPUTED cases. This diagram does not substitute intended behavior for the current fallback label."],
    sources: [['frontend/src/pages/public/OrderTrackingPage.tsx', 'const handleSearch ='], ['backend/src/modules/orders/orders.controller.ts', "@Get('track')"], ['backend/src/modules/orders/orders.service.ts', 'async trackOrderByPhoneOrSn'], ['backend/src/modules/orders/orders.service.ts', 'async checkPublicOrderRateLimit']],
  },
  {
    tab: "FR-17B - GHN and TEST Synchronization", title: "FR-17B | Carrier Journey vs. SCANMS Order Status",
    lanes: ['«actor» Customer / Shop', '«boundary» GhnTrackingTimeline / ShippingSimulationControls', '«controller» ShippingController', '«service» GhnService', '«external» GHN API', '«database» Prisma / PostgreSQL'],
    actions: [
      M(0, 1, "Open parcel tracking"), M(1, 2, 'GET /api/shipping/ghn/track/:code?environment=…'),
      M(2, 3, 'trackOrder(code, environment)'), M(3, 3, "Validate code; resolve TEST/LIVE"),
      F('alt', "TEST simulation clock exists and simulation is enabled"), M(3, 5, "Read Order.rawPayload by ghnOrderCode"),
      M(3, 3, 'customerGhnSimulationDetail(rawPayload, code)'), R(3, 1, "Derive TEST timeline from clock; isSimulation=true"),
      A("Use carrier tracking"), M(3, 4, "POST /v2/shipping-order/detail in the selected environment"),
      R(4, 3, "Detail/status/log or error/not found"), M(3, 5, 'readTrackingEvidence(code, environment)'),
      F('opt', "Fresh valid carrier status"), M(3, 5, "saveTrackingEvidence: persist observed status/events"), E(),
      M(3, 3, "Merge events; flag isStale/unavailable when data is missing"), R(3, 2, "Public tracking without ghnRawDetail"), R(2, 1, "Timeline with TEST/LIVE label"), E(),
      M(1, 1, "Poll 30s real / 5s simulation; stop when terminal"),
      N("Viewing a delivered timeline does not change Order.status from SHIPPING to DELIVERED. For TEST simulation, the Shop must explicitly synchronize the delivery result using the separate endpoint below."),
      F('opt', "SHOP/ADMIN/MANAGER explicitly synchronizes TEST delivery"),
      M(0, 1, "Shop requests synchronization; Customer cannot perform this action"), M(1, 2, 'POST /api/shipping/ghn/simulation/:orderId/complete + JWT'),
      M(2, 2, 'JwtAuthGuard + RolesGuard; resolve Shop context'), M(2, 3, 'completeCustomerSimulation(orderId, actorId, shopContext)'),
      F('critical', 'Prisma transaction'), M(3, 5, "Lock Order; require owned Shop, GHN TEST and elapsed simulation"),
      M(3, 5, 'SHIPPING → DELIVERED; deliveredAt; raw simulation.completedAt; notify'), R(5, 3, "COMMIT, error, or replay without duplicate writes"), E(),
      R(3, 1, "Synchronization result"), M(1, 1, "Invalidate /orders cache and reload list"), R(1, 0, "TEST order DELIVERED; no automatic payment or escrow release"), E(),
    ],
    notes: ["Simulation is forbidden for LIVE/production. The clock starts through /simulation/:orderId/start; shipment creation is outside this sequence.", "Persisting carrier observations through GET is not an order receipt event. GHN callbacks and Customer receipt confirmation are separate entry points, not the same as viewing tracking."],
    sources: [['frontend/src/components/shipping/GhnTrackingTimeline.tsx', 'export function GhnTrackingTimeline'], ['backend/src/modules/shipping/ghn.service.ts', 'async trackOrder('], ['backend/src/modules/shipping/ghn.service.ts', 'async completeCustomerSimulation'], ['frontend/src/components/shipping/ShippingSimulationControls.tsx', 'export function ShippingSimulationControls']],
  },
  {
    tab: 'FR-18A — Customer review', title: "FR-18A | Authenticated Customer Review",
    lanes: ['«actor» Customer', '«boundary» CustomerPortalPage / VerifiedReviewModal', '«controller» CustomerController', '«service» CustomerService', '«storage» Upload API / Cloudinary', '«database» Prisma / PostgreSQL'],
    actions: [
      F('opt', "Order DELIVERED with no return request"),
      M(0, 1, "Confirm receipt and complete order"), M(1, 2, 'POST /api/customer/orders/:id/confirm-receipt + JWT'),
      M(2, 3, "confirmReceipt(JWT userId, orderId)"), M(3, 5, "getOrderDetails: verify ownership and state"),
      F('critical', 'Prisma transaction'), M(3, 5, 'Conditional update DELIVERED → COMPLETED, completedAt=now'),
      M(3, 5, "Create ORDER_COMPLETED notification in the same tx"), R(5, 3, "COMMIT or rollback if the order changed"), E(), R(3, 1, "Order COMPLETED"), E(),
      M(0, 1, "Select product, 1-5 stars, comment >=10 characters; optional images"),
      F('opt', "Images selected; modal limit is five"), M(1, 4, 'uploadService.uploadImage → URL'), R(4, 1, "Image URLs or upload error; do not submit after upload failure"), E(),
      M(1, 2, 'POST /api/customer/orders/:id/reviews + JWT + payload'),
      M(2, 3, 'createVerifiedReview(userId, orderId, dto)'),
      M(3, 5, "getOrderDetails: owner, COMPLETED, no returnRequest"),
      M(3, 3, "Require product in order and no existing review"),
      F('alt', "Invalid ownership/state/product or duplicate"), R(3, 1, "HTTP 4xx; keep form for correction/retry"),
      A("Valid review"), M(3, 5, 'productReview.create: PENDING, isApproved=false'), R(5, 3, "New review; UNIQUE(orderId,productId) is the final safeguard"),
      R(3, 2, '{message, review}'), R(2, 1, 'HTTP 201'), R(1, 0, "Close modal and reload order; review awaits moderation"), E(),
      N("Next: Shop/Admin calls PATCH /api/products/reviews/:reviewId/moderation -> ProductsService.moderateReview -> verify Shop ownership -> transaction updates review + AuditLog -> invalidate landing cache. Public reads only isApproved=true reviews."),
    ],
    notes: ["This authenticated Customer flow does not use the public tracking reviewToken. createVerifiedReview uses one INSERT without an explicit transaction/row lock spanning its prechecks. No unimplemented lock is shown.", "The current toast says Posted while the backend returns Pending moderation. This Customer modal supports images, not the public modal's video input."],
    sources: [['frontend/src/components/customer/VerifiedReviewModal.tsx', 'const submit ='], ['frontend/src/services/customer.service.ts', 'async submitVerifiedReview'], ['backend/src/modules/customer/customer.service.ts', 'async confirmReceipt'], ['backend/src/modules/customer/customer.service.ts', 'async createVerifiedReview'], ['backend/src/modules/products/products.service.ts', 'async moderateReview']],
  },
  {
    tab: "FR-18B - Public Review Contract Mismatch", title: "FR-18B | Public Review - Current Failure Path",
    subtitle: "Static code analysis only. Business logic is unchanged. This is not presented as a working happy path.",
    lanes: ["Public customer", '«boundary» ProductReviewModal / reviewService', '«controller» OrdersController', '«service» OrdersService', '«service» ReviewMediaService', '«database» Prisma / PostgreSQL'],
    actions: [
      M(0, 1, "Verify phone and order code"), M(1, 2, 'GET /api/orders/track?phone&orderSn'),
      M(2, 3, 'trackOrderByPhoneOrSn(query)'), M(3, 5, "Read order and products"),
      R(3, 1, 'reviewToken = HMAC(orderId, expiresAt, purpose)'),
      M(1, 1, "verifyOrder requires order.status=COMPLETED"),
      F('opt', "Images or video selected"), M(1, 2, 'POST /orders/:id/review/media {productId, reviewToken, file}'),
      M(2, 4, 'upload(orderId, dto, file)'), M(4, 4, 'verifyReviewToken; MIME/magic bytes/size; config storage'),
      M(4, 5, "Require COMPLETED, product in order and no review"),
      R(4, 1, "Cloudinary secureUrl or 4xx/503"), E(),
      M(0, 1, "Submit review"), M(1, 2, 'POST /api/orders/:id/review {productId,rating,comment,images,video?,reviewToken}'),
      M(2, 3, 'addOrderReview(orderId, dto)'), M(3, 3, 'Validate comment; verify HMAC token'), M(3, 5, "Read order and items"),
      M(3, 3, "Compare reviewToken with cancellationToken; require matching customerPhone"),
      N("CONTRACT MISMATCH: reviewService.submit omits customerPhone. /track issues an expiring HMAC token, not the stored cancellationToken. The !tokenMatches || !suppliedPhone check rejects the current FE request.", true),
      R(3, 2, 'ForbiddenException'), R(2, 1, 'HTTP 403'), R(1, 0, "Display error and retain form; no ProductReview created"),
      N("Order locking, duplicate recheck and PENDING review insertion exist later in addOrderReview, but this public request cannot reach them. No fictitious successful COMMIT is shown."),
    ],
    notes: ["This is a static code finding; no review was submitted to the group DB. Unify the token mechanism and FE/BE contract in a separate fix before accepting public review.", "OrderTrackingPage allows DELIVERED to open the modal, while reviewService.verifyOrder requires COMPLETED. The diagram preserves this inconsistency."],
    sources: [['backend/src/modules/orders/order-security.utils.ts', 'export function createReviewToken'], ['frontend/src/services/review.service.ts', 'async submit('], ['backend/src/modules/orders/orders.service.ts', 'const tokenMatches'], ['backend/src/modules/orders/review-media.service.ts', 'async upload(']],
  },
  {
    tab: "FR-19 - Webhook Intake", title: "FR-19 | Authenticated, Idempotent Webhook Intake",
    lanes: ["Marketplace / integration adapter", '«controller» OrdersController', '«service» OrdersService', '«strategy» OrderWebhookNormalizerService', '«database» Prisma / PostgreSQL'],
    actions: [
      M(0, 1, 'POST /api/orders/webhook + x-webhook-secret; source/store/payload'),
      M(1, 2, 'receiveWebhook(dto, secret)'), M(2, 4, "findWebhookStore(storeId or slug)"),
      M(2, 2, 'verifyWebhookSecret theo storeId:source'),
      F('alt', "Missing configuration or invalid secret"), R(2, 0, "503 configuration error or 401; do not persist order"),
      A("Authenticated webhook"), M(2, 3, 'normalize(source, payload)'), M(3, 3, "Select Shopee / TikTok / Shopify normalizer"),
      R(3, 2, 'NormalizedExternalOrder + eventAt/receivedAt'), M(2, 2, "Validate VND, items, prices, totals and phone"),
      M(2, 4, 'findWebhookOrder(store, platform, externalOrderId)'),
      F('alt', "Order already exists"),
      F('opt', "eventAt is newer than sourceUpdatedAt"), M(2, 4, "BEGIN; lock Order FOR UPDATE; reread timestamp/state"),
      M(2, 2, "Validate transition; reject backward state changes"), M(2, 4, 'UPDATE status/rawPayload/sourceUpdatedAt; COMMIT'), E(),
      R(2, 0, '200 created=false, idempotent=true'),
      A("New order"), M(2, 4, "Resolve approved product SKU/ID within Shop"), M(2, 2, "Verify subtotal - discount + shipping + tax = total"),
      F('critical', "Order creation transaction"), M(2, 4, 'INSERT Order + nested OrderItems, commission fields=0'), R(4, 2, 'COMMIT'), E(),
      F('alt', "Concurrent duplicate causes P2002"), M(2, 4, "Read concurrently created order; synchronize newer event if applicable"), R(2, 0, '200 created=false'),
      A("Creation succeeded"), R(2, 0, '200 created=true, idempotent=false'), E(), E(), E(),
    ],
    notes: ["Body source values are shopee/tiktok/shopify; secrets are scoped to Shop/source. This is an intake endpoint, not automatic marketplace account linking or native signature verification for each platform.", "Database uniqueness uses Shop + sourcePlatform + externalOrderSn. A duplicate without a timestamp cannot overwrite data. Invalid payload/SKU/totals return 400; invalid transitions return 409; transaction failures roll back.", "Webhook intake does not decrement stock, create commissions, credit wallets or assign KOL attribution. FR-21 runs separately only if the order has valid attribution."],
    sources: [['backend/src/modules/orders/orders.controller.ts', "@Post('webhook')"], ['backend/src/modules/orders/orders.service.ts', 'async receiveWebhook'], ['backend/src/modules/orders/orders.service.ts', 'private async syncWebhookStatus'], ['backend/src/modules/orders/order-security.utils.ts', 'export function verifyWebhookSecret']],
  },
  {
    tab: "FR-20A - Manual Order Creation", title: "FR-20A | Shop Creates a Manual Order",
    lanes: ["Shop / administrator", '«boundary» OrdersManagementPage / orderService', '«controller» OrdersController', '«service» ManualOrdersService', '«service» CouponsService', '«database» Prisma / PostgreSQL'],
    actions: [
      M(0, 1, "Enter recipient, address, SKU, quantity, price, shipping and note"),
      F('opt', "Apply discountCode"), M(1, 2, 'POST /api/orders/manual/discount + JWT'), M(2, 3, 'quoteDiscount(manager, dto)'), M(3, 4, 'validateManualCoupon → validateCoupon'), R(4, 1, "Discount preview; quota not consumed"), E(),
      M(0, 1, "Create order"), M(1, 1, "Validate form; in-flight guard; stable requestId on retry"),
      M(1, 2, 'POST /api/orders/manual + JWT + CreateManualOrderDto'), M(2, 2, 'JwtAuthGuard + RolesGuard + DTO validation'),
      M(2, 3, 'createManualOrder(manager, dto)'), M(3, 5, "resolveManagedStore; resolve SKU/ID within Shop"),
      M(3, 3, "Normalize inputs/money; compute fingerprint and order code"),
      F('alt', "requestId replay without a custom externalOrderSn"), M(3, 5, "Read INTERNAL order with the same code"), R(3, 1, "Same fingerprint: existing order; different: 409"),
      A("New order"),
      F('opt', "Coupon provided"), M(3, 4, "validateManualCoupon before transaction"), R(4, 3, 'Coupon context + snapshot version/quota'), E(),
      F('critical', "One Prisma transaction per order"), M(3, 5, 'SELECT products ORDER BY id FOR UPDATE'), M(3, 3, "Aggregate duplicate SKUs; verify active state and stock"),
      F('opt', "Coupon context prepared"), M(3, 5, 'Lock coupon; recheck version/usage/budget/expiry'), E(),
      M(3, 3, "Compute authoritative total; compare client total if provided"), M(3, 5, 'INSERT Order INTERNAL + OrderItems, commission=0'),
      F('opt', "Coupon provided"), M(3, 5, 'UPDATE usage/budget; INSERT CouponRedemption'), E(), R(5, 3, "COMMIT; failure rolls back the entire order"), E(),
      R(3, 2, '{message, order}'), R(2, 1, "201; newly created or replayed order"), R(1, 0, "Show order code; close form and refresh list"), E(),
    ],
    notes: ["Stock is locked/checked but not decremented or reserved in this reconciliation path. Saving a manual order does not call GHN quote/shipment creation.", "Transaction timeout is 30s. Failure cannot leave partial order/items/coupon consumption within one order. An existing custom externalOrderSn returns 409, not a requestId replay.", "createManualOrderForStore does not assign coupon KOL attribution to Order.attributedCollaboratorId. This diagram does not assume every manual order generates commission."],
    sources: [['frontend/src/pages/merchant/OrdersManagementPage.tsx', 'async function submitManual'], ['backend/src/modules/orders/orders.controller.ts', "@Post('manual')"], ['backend/src/modules/orders/manual-orders.service.ts', 'async createManualOrderForStore']],
  },
  {
    tab: 'FR-20B — Import Excel', title: "FR-20B | Excel Import - Atomic per Order, Not per File",
    lanes: ['«actor» Shop', '«boundary» OrdersManagementPage / orderService', '«controller» OrdersController', '«service» ExcelOrderImportService', '«service» ManualOrdersService', '«database» Prisma / PostgreSQL'],
    actions: [
      F('opt', "Download template"), M(1, 2, 'GET /api/orders/import-excel/template + JWT'), M(2, 3, 'createTemplate()'), R(3, 1, "XLSX buffer; download template file"), E(),
      M(0, 1, "Select .xlsx and import"), M(1, 2, 'POST /api/orders/import-excel multipart {file, storeId?}'),
      M(2, 2, 'JWT + roles + FileInterceptor(file), max 5MB'), M(2, 3, 'importOrders(manager, dto, file)'),
      M(3, 3, "Validate file; load first worksheet; <=10,000 rows"),
      M(3, 3, 'Require order_code, customer_name, customer_phone, shipping_address, sku, quantity'),
      F('loop', "Each nonempty row"), M(3, 3, "parseRow; validate; collect row/order_code errors"), E(),
      M(3, 3, "groupRowsByOrder; skip invalid or inconsistent groups"),
      M(3, 4, 'resolveManagedStore(manager, storeId?)'), R(4, 3, "Authorized Shop"),
      F('loop', "Each valid order_code group"),
      M(3, 4, 'createManualOrderForStore(store.id, manualDto)'),
      M(4, 5, "Separate transaction: check stock; persist Order + Items"),
      F('alt', "Group saved"), R(5, 4, 'COMMIT'), R(4, 3, "Order ID; append importedOrders[]"),
      A("Duplicate order / invalid SKU / transaction failure"), R(4, 3, "Collect row errors; increment skippedOrders"),
      N("If a transaction started, roll back only that order. Validation, duplicate and SKU errors may occur before a transaction begins. Previously committed orders remain intact."), E(), E(),
      R(3, 2, '{summary, importedOrders, errors[]}'), R(2, 1, "200 even when some groups failed"),
      R(1, 0, "Display imported/skipped counts and row errors; refresh list"),
    ],
    notes: ["Corrupt files, missing columns or empty data return 400 before import. The entire file is not all-or-nothing. Each order group reuses ManualOrdersService and FR-20A rules.", "The current importer does not parse shippingFee or discountCode columns. It maps name/phone/address/status/discountAmount/items only. No unimplemented GHN dynamic quote or coupon lookup is shown."],
    sources: [['backend/src/modules/orders/excel-order-import.service.ts', 'async importOrders'], ['backend/src/modules/orders/excel-order-import.service.ts', 'private groupRowsByOrder'], ['frontend/src/pages/merchant/OrdersManagementPage.tsx', 'async function importExcel']],
  },
  {
    tab: "FR-21A - Accrue Pending Commission", title: "FR-21A | Delivery -> Commission Calculation -> Pending Funds",
    lanes: ['«scheduler» CommissionSchedulerService', '«service» CommissionsService', '«service» CommissionCalculatorService', '«service» WalletsService', '«service» FinancialLedgerService', '«database» Prisma / PostgreSQL'],
    actions: [
      M(0, 1, "Every minute: reconcileCommissions(now)"), M(1, 5, "After reversal: select <=100 eligible delivered/completed orders with an active KOL and no commission"),
      F('loop', "Each order candidate"), M(1, 1, 'createPendingCommission(orderId, now)'),
      F('critical', "Transaction; lock Order first"), M(1, 5, "SELECT orders FOR UPDATE; reread items/KOL/tier/commissions"),
      F('alt', "No longer eligible or commission already exists"), R(1, 0, "false; no new record"),
      A("Eligible order and valid KOL"), M(1, 2, 'calculateOrderCommission(items, defaultRate, tierBonus, discount+refund)'),
      M(2, 2, "Preserve snapshots; otherwise base10+tier with net ratio"),
      R(2, 1, "Per-item rate/amount and Decimal total"), M(1, 5, "UPDATE item snapshots missing commissionSnapshotAt"),
      M(1, 1, 'eligibleAt = completedAt ?? updatedAt; availableAt = adaptive(start,14)'),
      M(1, 5, 'INSERT Commission, storeWalletTracked=true'),
      F('alt', "Total commission > 0"), M(1, 3, 'creditPendingBalance(tx, KOL, amount, ref=COMMISSION, storeId)'),
      M(3, 5, "Upsert/lock Wallet, then StoreWallet FOR UPDATE"), M(3, 5, "UPDATE global/Shop pending balances; version++"),
      M(3, 4, 'appendEntry(tx, PENDING, COMMISSION_PENDING, +amount)'), M(4, 5, "INSERT FinancialLedger in the same transaction"),
      A("Total commission = 0"), N("Create APPROVED commission with approvedAt=now. Do not create a zero ledger entry or credit wallet funds."), E(),
      R(5, 1, "COMMIT all writes or roll back"), E(), E(), E(),
      R(1, 0, 'Summary created/approved/reversed/failed'),
    ],
    notes: ["Checkout snapshots include base+tier+deal+campaign+live, capped at 25%. The engine preserves them. Legacy fallback uses only base10+tier0-3 and cannot reconstruct historical deal/campaign/live bonuses.", "CommissionSchedulerService skips execution when DISABLE_SCHEDULED_JOBS=true. A failed candidate increments failed; processing continues for other candidates.", "A manual/webhook order without attribution is not a commission candidate. Product commission rates alone do not identify a KOL."],
    sources: [['backend/src/modules/commissions/commission-scheduler.service.ts', 'async reconcileCommissionBalances'], ['backend/src/modules/commissions/commissions.service.ts', 'async createPendingCommission'], ['backend/src/modules/commissions/commission-calculator.service.ts', 'calculateOrderCommission(']],
  },
  {
    tab: "FR-21B - Release Escrow", title: "FR-21B | Mature Commission -> Available Funds",
    lanes: ['«scheduler» CommissionSchedulerService', '«service» CommissionsService', '«service» WalletsService', '«service» FinancialLedgerService', '«database» Prisma / PostgreSQL'],
    actions: [
      M(0, 1, "reconcileCommissions(now): after reversal and creation"),
      M(1, 4, "Select PENDING commissions with availableAt<=now and eligible order status"),
      F('loop', "Each mature commission"), M(1, 1, 'approveMatureCommission(id, now)'),
      F('critical', 'Prisma transaction'), M(1, 4, "Read orderId; lock Order, then Commission FOR UPDATE"), M(1, 4, "Reread commission status, availableAt and Order.status"),
      F('alt', "Not PENDING / not mature / ineligible order"), R(1, 0, "false; no balance transfer"),
      A("Eligible for release"),
      M(1, 2, "releasePendingBalance(tx, KOL, amount, ref, tracked storeId)"),
      M(2, 4, "Lock Wallet, then StoreWallet; require sufficient pending funds"),
      M(2, 4, "UPDATE both wallets: pending-amount, available+amount; version++"),
      M(2, 3, 'appendEntry: PENDING / COMMISSION_APPROVED / −amount'), M(3, 4, 'INSERT ledger PENDING'),
      M(2, 3, 'appendEntry: AVAILABLE / COMMISSION_APPROVED / +amount'), M(3, 4, 'INSERT ledger AVAILABLE'),
      M(1, 4, 'UPDATE Commission APPROVED, approvedAt=now'), R(4, 1, "COMMIT or roll back all writes"), E(), E(), E(),
      N("The next WalletPage fetch of /wallets/me and /wallets/me/ledger shows updated balances and two ledger entries. This is not a bank transfer or an Order.COMPLETED update."),
    ],
    notes: ["availableAt is computed at commission creation using the configured holiday list; cron compares the stored timestamp. No automatic bank reconciliation or identity verification occurs after 14 days.", "RETURN_REQUESTED/DISPUTED are ineligible for approval. Zero commissions are approved immediately at creation. Legacy storeWalletTracked=false updates only the global wallet."],
    sources: [['backend/src/modules/commissions/commissions.service.ts', 'async approveMatureCommission'], ['backend/src/modules/wallets/wallets.service.ts', 'async releasePendingBalance'], ['backend/src/modules/commissions/utils/vietnam-holidays.util.ts', 'export function calculateAdaptiveEscrowReleaseDate']],
  },
  {
    tab: 'FR-21C — Clawback', title: "FR-21C | Cancellation/Return -> Commission Clawback",
    lanes: ['«scheduler» CommissionSchedulerService', '«service» CommissionsService', '«service» WalletsService', '«service» FinancialLedgerService', '«database» Prisma / PostgreSQL'],
    actions: [
      N("Precondition: a valid cancellation/return workflow has set Order to CANCELLED or RETURNED. RETURN_REQUESTED/DISPUTED do not enter this reversal path."),
      M(0, 1, "reconcileCommissions(): reversals first"), M(1, 4, "Select PENDING/APPROVED commissions for CANCELLED/RETURNED orders"),
      F('loop', "Each candidate"), M(1, 1, 'reverseCommission(id, now)'), F('critical', "Transaction with consistent lock order"),
      M(1, 4, "Read orderId; lock Order -> Commission; reread"),
      F('alt', "Already REVERSED or order no longer reversible"), R(1, 0, "false; no duplicate clawback"),
      A("Eligible for reversal"), F('alt', 'Commission PENDING, amount > 0'),
      M(1, 2, 'reversePendingBalance(tx, …)'), M(2, 4, "Lock Wallet -> StoreWallet; pending funds must cover amount"),
      M(2, 4, 'UPDATE pending−amount; version++'),
      A('Commission APPROVED, amount > 0'), M(1, 2, 'reverseAvailableBalance(tx, …)'),
      M(2, 4, 'Lock Wallet → StoreWallet; available−amount'),
      N("APPROVED clawback may create negative recoverable debt if the KOL already spent/withdrew funds. It does not clamp balances to zero or trigger a bank recovery transaction."), E(),
      F('opt', 'amount > 0'), M(2, 3, "appendEntry REVERSAL in the relevant bucket, -amount"), M(3, 4, "INSERT compensating ledger entry; preserve original entry"), E(),
      M(1, 4, 'UPDATE Commission REVERSED, reversedAt=now'), R(4, 1, "COMMIT; failure rolls back all writes"), E(), E(), E(),
    ],
    notes: ["Approval/reversal locks Order before Commission to serialize release and clawback. The reference/bucket/type unique index is an additional duplicate-entry safeguard.", "Insufficient pending funds during clawback raise an invariant error rather than concealing a reconciliation mismatch. Available-balance clawback may create debt under the current engine behavior."],
    sources: [['backend/src/modules/commissions/commissions.service.ts', 'async reverseCommission'], ['backend/src/modules/wallets/wallets.service.ts', 'async reversePendingBalance'], ['backend/src/modules/wallets/wallets.service.ts', 'async reverseAvailableBalance']],
  },
  {
    tab: "FR-22 - Store-Scoped Withdrawal", title: "FR-22 | Withdrawal with Pessimistic Row Locks",
    lanes: ['«actor» KOL', '«boundary» WalletPage / walletService', '«controller» PayoutsController', '«service» PayoutsService', '«service» WalletsService', '«database» Prisma / PostgreSQL'],
    actions: [
      M(0, 1, "Open wallet; select Shop and gross amount"),
      M(1, 2, 'GET /api/wallets/withdrawals?page=… + JWT'), R(2, 1, "Current KOL's withdrawal history"),
      N("WalletPage also reads /wallets/me and /wallets/me/ledger through WalletsController -> WalletSummaryService for global/Shop balances, KYC, bank details, minimum amount and tax policy."),
      M(0, 1, "Submit withdrawal"), M(1, 1, "In-flight guard; validate amount/KYC/bank and balance preview"),
      M(1, 2, 'POST /api/wallets/withdrawals {amount:string, storeId} + JWT'), M(2, 2, 'JWT + RolesGuard(COLLABORATOR) + DTO'),
      M(2, 3, 'createWithdrawal(user.id, dto)'), M(3, 3, 'Validate Decimal, Shop UUID, minimum; calculateTax(gross)'),
      F('critical', "Prisma transaction with shared tx client"), M(3, 5, "Validate active Shop/owner and active KOL/VERIFIED KYC/bank"),
      M(3, 4, 'debitAvailableBalanceForWithdrawal(tx, KOL, gross, payoutRef, storeId)'),
      M(4, 5, 'UPSERT Wallet; SELECT … FROM wallets FOR UPDATE'), M(4, 5, "Read Wallet after acquiring lock; require available >= gross"),
      M(4, 5, 'UPSERT StoreWallet; SELECT … FROM store_wallets FOR UPDATE'),
      M(4, 4, "Require selected Shop's available balance >= gross"),
      F('alt', "Insufficient global or Shop funds"), R(4, 3, 'BadRequestException'), N("Roll back transaction; no payout, ledger or balance changes persist."),
      A("Both balances sufficient"), M(4, 5, 'UPDATE hai available balances − gross, version++'),
      M(4, 5, 'Qua FinancialLedgerService: INSERT PAYOUT_WITHDRAW, AVAILABLE, −gross'),
      R(4, 3, 'Wallet sau debit'), M(3, 5, 'INSERT PayoutRequest PENDING + gross/tax/net + bank snapshot'),
      R(5, 3, 'COMMIT'), E(), E(),
      F('alt', "Transaction succeeded"), R(3, 2, "{request, availableBalance}; money serialized as strings"), R(2, 1, '201 Created'),
      M(1, 1, "Expand history; clear amount; reload wallet/ledger/withdrawals"), R(1, 0, "Display pending request and updated balance"),
      A("Transaction rejected"), R(3, 1, "HTTP 400/error; retain form; reload history before retry"), E(),
      N("Concurrent requests for the same KOL wait on the Wallet lock and read committed balances after acquiring it. Insufficient funds cause rollback regardless of the FE preview. Locks do not deduplicate two otherwise valid requests."),
    ],
    notes: ["FR-22 makes no bank transfer. Tax is included in gross and is not debited separately; FR-24 approval does not debit again. Payout/ledger failures roll back both wallets.", "PayoutsController handles /wallets/withdrawals; WalletsController handles /wallets/me and /me/ledger. The default minimum is 200,000 and is configurable through MIN_PAYOUT_AMOUNT."],
    sources: [['frontend/src/pages/collaborator/WalletPage.tsx', 'async function handleWithdrawal'], ['backend/src/modules/payouts/payouts.service.ts', 'async createWithdrawal'], ['backend/src/modules/wallets/wallets.service.ts', 'private async lockWallet'], ['backend/src/modules/wallets/wallets.service.ts', 'private async lockStoreWallet']],
  },
  {
    tab: "FR-23 - Tax and Immutable Ledger", title: "FR-23 | Tax Calculation and Append-Only Ledger",
    subtitle: "Detail of the same FR-22 request, not a second withdrawal or debit.",
    lanes: ['«service» PayoutsService', '«service» PayoutTaxService', '«service» WalletsService', '«service» FinancialLedgerService', '«database» PostgreSQL'],
    actions: [
      M(0, 1, 'calculateTax(gross Decimal)'), M(1, 1, 'Validate finite, >0, scale ≤2'),
      F('alt', 'gross ≥ 2.000.000'), M(1, 1, "tax = roundHalfUp(gross * 0.10, 2)"),
      A('gross < 2.000.000'), M(1, 1, 'tax = 0'), E(),
      R(1, 0, '{grossAmount, taxAmount, netAmount=gross−tax}'),
      F('critical', "FR-22 transaction after KYC/Shop/bank validation"), M(0, 2, 'debitAvailableBalanceForWithdrawal(tx, …, gross, ref)'),
      M(2, 4, "Lock Wallet -> StoreWallet; update balances by -gross"),
      M(2, 3, 'appendEntry(tx, walletId, payoutRef, signedChange, storeBalances)'),
      M(3, 3, 'Assert finite, nonzero, scale≤2, before+amount=after'),
      M(3, 4, 'INSERT financial_ledgers: signed gross, AVAILABLE, PAYOUT_WITHDRAW'),
      M(4, 4, "CHECK balance invariant + unique(wallet,bucket,ref,type) + FK"),
      R(4, 3, "New ledger row"), R(3, 2, 'Ledger row'), R(2, 0, "Debited wallet"),
      M(0, 4, "INSERT payout_requests with gross/tax/net snapshot"), R(4, 0, "COMMIT; any failure rolls back"), E(),
      F('alt', "UPDATE / DELETE / TRUNCATE attempted on financial_ledgers"), M(4, 4, 'Trigger reject_financial_ledger_mutation()'), R(4, 0, "SQLSTATE 55000; mutation rejected"),
      A("A valid correction/reversal is required"), N("Append a new REVERSAL/PAYOUT_REJECT_REFUND entry and preserve the original row and business reference."), E(),
    ],
    notes: ["Example: 2,000,000 gross -> 200,000 tax and 1,800,000 net. There is no separate TAX_WITHHOLD ledger entry or 2,200,000 wallet debit. The threshold is per payout, not cumulative per month.", "Mutation triggers run on UPDATE/DELETE/TRUNCATE, not each INSERT. A DBA/superuser can administer DDL; the diagram describes ordinary application/database constraints, not protection against all DBA actions.", "Tax follows the project requirement. A snapshot is not proof that tax was remitted or that every legal tax scenario is supported."],
    sources: [['backend/src/modules/payouts/payout-tax.service.ts', 'calculateTax('], ['backend/src/modules/wallets/financial-ledger.service.ts', 'appendEntry('], ['backend/prisma/migrations/20260912200000_fr23_immutable_ledger/migration.sql', 'CREATE FUNCTION']],
  },
  {
    tab: "FR-24A - Approve and View Receipt", title: "FR-24A | Shop Records Payment with a Private Receipt",
    lanes: ['«actor» Shop', '«boundary» PayoutApprovalPage / payoutService', '«controller» PayoutApprovalController', '«service» MerchantPayoutsService', '«service» PayoutBillService / Cloudinary', '«database» Prisma / PostgreSQL'],
    actions: [
      M(0, 1, "Select payout; upload image/PDF receipt; optional note/reference"),
      M(1, 2, 'POST /api/payouts/:id/approve multipart + JWT'), M(2, 2, 'JWT + role SHOP_MANAGER; validate DTO; FileInterceptor(bill)'),
      M(2, 5, "Find payout owned by store.ownerId=user.id; resolve storeId"), M(2, 3, 'approvePayout(storeId, user.id, payoutId, dto, bill)'),
      M(3, 5, "Verify ownership, owned payout and matching Shop debit ledger"), M(3, 4, 'validateBill(file); uploadBill(file)'),
      M(4, 4, 'Signature/MIME/ext/size≤5MB; SHA256; upload authenticated'),
      F('alt', "Upload failed or invalid file"), R(4, 1, "4xx/503; payout and wallet remain unchanged"),
      A("Upload succeeded"), R(4, 3, 'private publicId/format/sha256/secureUrl'),
      F('critical', 'Prisma transaction'), M(3, 5, 'Recheck ownership; lock payout FOR UPDATE'),
      M(3, 3, "Require PENDING/PROCESSING and valid funded gross/tax/net"),
      M(3, 5, 'UPDATE APPROVED + bill/hash/ref + approver + processedAt'),
      M(3, 5, 'INSERT AuditLog APPROVE_PAYOUT'),
      R(5, 3, "COMMIT or rollback"), E(),
      F('alt', "State/hash/reference conflict or DB failure"), M(3, 5, "Check whether any payout references the uploaded publicId"),
      F('opt', "Upload is unlinked"), M(3, 4, 'removeUnusedBill(publicId)'), E(), R(3, 1, "409/error; reload status before retry"),
      A("Commit succeeded"), R(3, 2, 'Payout APPROVED'), R(2, 1, "201; refresh list/batches"), R(1, 0, "Display Shop-confirmed payment status"), E(), E(),
      F('opt', "Shop opens stored receipt"), M(1, 3, 'Qua MerchantPayoutsController: GET /stores/:storeId/payouts/:id/bill'),
      M(3, 5, "Verify ownership; read publicId/format"), M(3, 4, 'getBillDownloadUrl(publicId, format)'), R(4, 1, "HTTPS signed URL; expires in 120 seconds"), R(1, 0, "Display actual stored receipt"), E(),
    ],
    notes: ["A receipt does not automatically verify bank settlement. Approval does not call a bank transfer API, debit the wallet again or set Commission.PAID.", "The current FE calls POST /payouts/:id/approve with optional bankRefCode and PDF support. The legacy scoped PATCH approval route still exists but is not called by payoutService.approve.", "All list/bill/batch reads require Shop authorization. Upload happens before the database transaction with compensating cleanup; Prisma cannot roll back Cloudinary storage."],
    sources: [['frontend/src/services/payout.service.ts', 'async approve('], ['frontend/src/pages/merchant/PayoutApprovalPage.tsx', 'async function openBill'], ['backend/src/modules/payouts/payout-approval.controller.ts', 'async approve('], ['backend/src/modules/payouts/merchant-payouts.service.ts', 'async approvePayout'], ['backend/src/modules/payouts/payout-bill.service.ts', 'getBillDownloadUrl(']],
  },
  {
    tab: "FR-24B - Export VietQR Batch", title: "FR-24B | Persist and Export an XLSX Batch",
    lanes: ['«actor» Shop', '«boundary» PayoutApprovalPage / payoutService', '«controller» MerchantPayoutsController', '«service» PayoutBatchesService', '«support» MerchantPayoutsService / PayoutSettingsService', '«database» Prisma / PostgreSQL'],
    actions: [
      M(0, 1, "Select unbatched PENDING payouts; export VietQR"),
      M(1, 2, 'POST /api/stores/:storeId/payouts/export-vietqr {payoutIds}'),
      M(2, 2, 'JWT + role Shop/Admin/Manager + DTO'), M(2, 3, 'exportBatch(storeId, user.id, dto)'),
      M(3, 4, 'assertStoreOwnership; validate 1–200 ID UUID, unique'),
      F('critical', 'Transaction timeout 15s'), M(3, 4, 'Recheck ownership trong tx'),
      M(3, 5, 'SELECT payout_requests WHERE shop+ids ORDER BY id FOR UPDATE'),
      M(3, 5, "Read all requested rows; require PENDING and batchId=null"),
      F('loop', "Each payout"), M(3, 4, "assertFundedPayout(tx, request): matching debit ledger and gross/tax/net"), E(),
      M(3, 3, "buildWorkbook(batch, requests) before changing state"),
      M(3, 4, "resolveBank; generate VietQR URL with integer VND net amount"),
      F('alt', "Invalid bank / fractional net / workbook error / state conflict"), R(3, 1, "ROLLBACK; 4xx/error; no batch or PROCESSING update"),
      A("Workbook valid"), M(3, 5, "INSERT PayoutBatch with persisted XLSX fileData"),
      M(3, 5, "UPDATE payouts: PROCESSING and batchId"), M(3, 5, 'INSERT AuditLog EXPORT_VIETQR_PAYOUT_BATCH'),
      R(5, 3, 'COMMIT'), R(3, 2, '{batchId, filename, buffer}'), R(2, 1, "XLSX binary + X-Payout-Batch-Id; no JSON envelope"),
      R(1, 0, "Download workbook; refresh Pending transfer state"), E(), E(),
      F('opt', "Download existing batch"), M(1, 2, 'GET /stores/:storeId/payouts/batches/:batchId/download'),
      M(2, 3, 'downloadBatch(storeId, user.id, batchId)'), M(3, 5, "Verify authorization; read PayoutBatch.fileData"),
      R(5, 1, "Return exact persisted bytes; no new batch or state transition"), E(),
    ],
    notes: ["Export moves PENDING to PROCESSING without prior approval. After an external bank transfer, the Shop uploads a separate receipt to approve each payout through FR-24A.", "The file is a reconciliation workbook with VietQR Quick Links, not a universal bank import format. Generating a URL does not transfer money. Opening it shares beneficiary information with the VietQR provider.", "A downloaded batch can include payouts approved after export; downloading is not an instruction to pay again. Export creates no wallet debit or new financial ledger entry."],
    sources: [['frontend/src/pages/merchant/PayoutApprovalPage.tsx', 'const handleExportExcel ='], ['backend/src/modules/payouts/payout-batches.service.ts', 'async exportBatch'], ['backend/src/modules/payouts/payout-batches.service.ts', 'async buildWorkbook'], ['backend/src/modules/payouts/payout-batches.service.ts', 'async downloadBatch']],
  },
  {
    tab: "FR-24C - Reject and Refund Wallet", title: "FR-24C | Reject an Unbatched Payout and Refund Gross Once",
    lanes: ['«actor» Shop', '«boundary» PayoutApprovalPage / payoutService', '«controller» MerchantPayoutsController', '«service» MerchantPayoutsService', '«service» WalletsService', '«database» Prisma / PostgreSQL'],
    actions: [
      M(0, 1, "Reject payout and enter reason"), M(1, 2, 'PATCH /api/stores/:storeId/payouts/:id/reject {reason} + JWT'),
      M(2, 3, 'rejectPayout(storeId, user.id, payoutId, dto)'), M(3, 3, "Validate reason length 1-500; verify ownership"),
      F('critical', 'Prisma transaction'), M(3, 5, 'Recheck ownership; lock payout FOR UPDATE'),
      F('alt', "Not PENDING or already batched"), M(3, 3, "Throw ConflictException; roll back without refund"),
      A("PENDING and unbatched"), M(3, 5, "assertFundedPayout: matching Shop debit and valid gross/tax/net"),
      M(3, 4, 'refundRejectedWithdrawal(tx, KOL, gross, payoutRef, storeId)'),
      M(4, 5, 'Lock Wallet → StoreWallet; UPDATE available+gross, version++'),
      M(4, 5, 'Qua FinancialLedgerService: INSERT PAYOUT_REJECT_REFUND +gross'),
      M(3, 5, 'UPDATE payout REJECTED, reason, processedAt'), M(3, 5, 'INSERT AuditLog REJECT_PAYOUT'),
      R(5, 3, "COMMIT; failure rolls back status, balances and ledger"), E(), E(),
      F('alt', "Commit succeeded"), R(3, 2, 'Payout REJECTED'), R(2, 1, '200; refresh list'), R(1, 0, "Payout rejected; KOL reloads wallet to see gross refund"),
      A("State conflict or failure"), R(3, 1, "409/error; no refund; previous state preserved"), E(),
      N("A repeated rejection waits for the payout lock, sees REJECTED and returns 409. It cannot refund twice; ledger uniqueness and the transaction add safeguards. This path must not refund an already executed bank transfer."),
    ],
    notes: ["Refund gross, not only net, because request creation debited gross. Tax has not been recorded as remitted, so there is no extra refund beyond gross.", "PROCESSING payouts may already be submitted to an external bank. The implementation blocks automatic refunds and requires separate reconciliation."],
    sources: [['backend/src/modules/payouts/merchant-payouts.controller.ts', "@Patch(':payoutId/reject')"], ['backend/src/modules/payouts/merchant-payouts.service.ts', 'async rejectPayout'], ['backend/src/modules/wallets/wallets.service.ts', 'async refundRejectedWithdrawal']],
  },
];

const sequencePages = sequences.map(sequencePage);
BaseDrawing.save(path.join(__dirname, 'FR17_FR24_Sequence_Diagram.drawio'), sequencePages);
console.log(`Sequence diagram generated: ${sequencePages.length} pages.`);

// Fingerprints allow checking that regeneration used the same, possibly dirty, sources.
const sourceFiles = [...new Set([...classSpecs, ...sequences].flatMap(s => s.sources.map(([file]) => file)))].sort();
const fingerprint = crypto.createHash('sha256');
for (const file of sourceFiles) fingerprint.update(file).update(fs.readFileSync(path.join(ROOT, file)));
console.log(`Read-only code evidence: ${sourceFiles.length} files; SHA256 ${fingerprint.digest('hex')}`);
