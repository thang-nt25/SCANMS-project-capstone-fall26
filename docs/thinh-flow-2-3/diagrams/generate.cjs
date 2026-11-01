// Deterministic UML artifacts: editable draw.io documents and report-ready SVG.
// English labels, white backgrounds. Run: node docs/thinh-flow-2-3/diagrams/generate.cjs
const fs = require('node:fs');
const path = require('node:path');
const out = __dirname;
const esc = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const text = (x, y, value, size = 14, anchor = 'start', bold = false) => '<text x="' + x + '" y="' + y + '" font-family="Arial,sans-serif" font-size="' + size + '" text-anchor="' + anchor + '"' + (bold ? ' font-weight="bold"' : '') + ' fill="#1A1612">' + esc(value) + '</text>';
const header = (w, h, title, subtitle) => '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '"><defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M1 1 L9 5 L1 9" fill="none" stroke="#1A1612" stroke-width="1.4"/></marker></defs><rect width="100%" height="100%" fill="white"/>' + text(36, 35, title, 22, 'start', true) + text(36, 61, subtitle, 13);
const app = [
  ['pc', 'ProductsController', 'controller', ['+ create(dto)', '+ moderateProduct(id, dto)']],
  ['ac', 'AiRecommendationController', 'controller', ['+ getRecommendationsForProduct()', '+ getGeneralRecommendations()', '+ analyzeMatch(dto)']],
  ['dc', 'AffiliateDealsController', 'controller', ['+ createProposal(dto) / invite(dto)', '+ approve() / reject()', '+ acceptOffer() / declineOffer()']],
  ['ps', 'ProductsService', 'service', ['+ create(actorId, role, dto)', '+ update(actorId, role, id, dto)', '+ moderateProduct(actorId, id, dto)']],
  ['as', 'AiRecommendationService', 'service', ['+ getRecommendedKols(query, actor)', '+ analyzeMatch(dto, actor)', '- generateAiReasoning(...)']],
  ['ds', 'AffiliateDealsService', 'service', ['+ createProposal(kocId, dto)', '+ inviteShopOffer(actor, dto)', '+ respondToOffer(id, koc, accept)']],
  ['mc', 'MediaController', 'controller', ['+ findAll(query)', '+ create(dto)', '+ reviewMedia(id, dto)']],
  ['cg', 'ChatGateway', 'gateway', ['+ handleConnection(socket)', '+ handleJoinConversation(...)', '+ broadcastNewMessage(...)']],
  ['da', 'exclusive-deal-activation', 'module', ['+ decideExclusiveDeal(...)', '+ lockDealPair(tx, koc, store)', '+ couponTerms(input)']],
  ['ms', 'MediaService', 'service', ['+ findAll(query, viewer)', '+ create(actor, role, dto)', '+ reviewMedia(actor, id, dto)']],
  ['db', 'PrismaService', 'database adapter', ['+ $transaction(callback)', '+ $queryRaw(query)', '+ onModuleInit() / onModuleDestroy()']],
  ['rs', 'ReferralLinksService', 'service', ['+ createReferralLink(koc, dto,', '    ipAddress?, transaction?)']],
  ['ca', 'CacheService', 'cache adapter', ['+ get(key) / set(key, value, ttl)', '+ delPrefix(prefix)']],
  ['ppc', 'PricingController', 'controller', ['+ catalog() / list()', '+ floor() / create()', '+ review() / cancel()']],
  ['pps', 'PricingService', 'service', ['+ setFloor() / create() / review()', '+ reconcileDue()', '  MAP and promotion lifecycle']],
  ['sem', 'ProductSemanticMatcher', 'service', ['+ compare(title, candidates)', '  Local multilingual ONNX q8', '  Cosine >80; bounded queue']],
  ['pi', 'product-identity.policy', 'module', ['+ assertProductIdentity(tx, input)', '+ productNameSimilarity(left, right)']],
  ['dp', 'DashboardService', 'service', ['+ getShopKolOrders(actor, role,', '    collaboratorId, query)', '  period totals across all pages']],
].map(([id, name, kind, lines], i) => ({ id, name, kind, lines, x: 40 + (i % 3) * 420, y: 110 + Math.floor(i / 3) * 250, w: 340, h: 175 }));
const domain = [
  ['st', 'Store', ['id: UUID', 'ownerId: UUID', 'categoryName: string?', 'isActive / isDeleted: boolean']],
  ['us', 'User', ['id: UUID', 'role: UserRole', 'storeId: UUID?', 'isActive / isDeleted: boolean']],
  ['pr', 'Product', ['id / storeId: UUID', 'categoryName: string?', 'price / listPrice / floorPrice: Decimal?', 'moderationStatus: enum']],
  ['sc', 'StoreCollaborator', ['storeId / collaboratorId: UUID', 'status: PENDING | APPROVED | REJECTED', 'requestedByKol: boolean']],
  ['de', 'ExclusiveDealProposal', ['productId / collaboratorId: UUID', 'initiatedById: UUID?', 'offerTerms: JSON?', 'proposedCommissionRate: Decimal', 'targetRevenue: Decimal?', 'scopeType: Single | Selected | Store', 'status: pending / waiting admin / final', 'closedAt: DateTime?']],
  ['rl', 'ReferralLink', ['id: UUID', 'exclusiveDealId: UUID? (unique)', 'shortCode: string (unique)', 'customCouponCode: string?']],
  ['co', 'Conversation', ['id / storeId: UUID', 'collaboratorId / customerId: UUID?', 'lastMessageAt: DateTime']],
  ['cm', 'ChatMessage', ['conversationId / senderId: UUID', 'messageText: string', 'isRead: boolean']],
  ['cu', 'Coupon', ['storeId / collaboratorId: UUID', 'codeNormalized: string (unique)', 'discountValue / budgetTotal: Decimal', 'status: CouponStatus']],
  ['ep', 'ExclusiveDealProduct', ['proposalId / productId: UUID (PK)', 'referralLinkId: UUID? (unique)']],
  ['pv', 'ProductVariant', ['productId: UUID', 'price / listPrice / floorPrice: Decimal?']],
  ['pm', 'ProductPricePromotion', ['productId / variantId?: UUID', 'proposedPrice / budgetTotal / budgetUsed', 'startsAt / endsAt: DateTime', 'requestedBy / reviewedBy: User', 'status: PricePromotionStatus']],
  ['pu', 'ProductPromotionUsage', ['promotionId / orderId: UUID (PK)', 'discountAmount / quantity', 'releasedAt: DateTime?']],
  ['od', 'Order', ['storeId: UUID', 'rawPayload.goodsPricing: JSON', 'status / completedAt / refundedAmount']],
  ['ma', 'MediaAsset', ['storeId: UUID', 'productId / collaboratorId: UUID?', 'assetType / status: enum', 'urlOrContent: string']],
].map(([id, name, lines], i) => ({ id, name, kind: 'entity', lines, x: 40 + (i % 3) * 420, y: 110 + Math.floor(i / 3) * 265, w: 340, h: 210 }));

function classPage(title, nodes, edges, file) {
  const w = 1280, h = Math.max(1190, ...nodes.map(n => n.y + n.h + 90));
  let svg = header(w, h, title, 'SCANMS | Implemented Flow 2–3 | VIP: 10-25%, Admin >16%, revenue KPI | 2026-11-01');
  let cells = '<mxCell id="0"/><mxCell id="1" parent="0"/>';
  const lookup = Object.fromEntries(nodes.map(node => [node.id, node]));
  for (const [i, edge] of edges.entries()) {
    const [a, b, label, via] = edge; const s = lookup[a], t = lookup[b];
    const port = (n, p) => {
      const dx = p[0] - (n.x+n.w/2), dy = p[1] - (n.y+n.h/2);
      return Math.abs(dx)/(n.w/2) > Math.abs(dy)/(n.h/2) ? [n.x+(dx>0?n.w:0),n.y+n.h/2] : [n.x+n.w/2,n.y+(dy>0?n.h:0)];
    };
    const start = port(s, via?.[0] || [t.x+t.w/2,t.y+t.h/2]);
    const end = port(t, via?.[via.length-1] || [s.x+s.w/2,s.y+s.h/2]);
    const points = [start, ...(via || []), end];
    const dependency = nodes.some(node => node.kind !== 'entity') || label.includes('(no FK)');
    svg += '<polyline points="' + points.map(p => p.join(',')).join(' ') + '" fill="none" stroke="#1A1612" stroke-width="1.2"' + (dependency ? ' stroke-dasharray="6 4" marker-end="url(#arrow)"' : '') + '/>';
    const segments = points.slice(1).map((p,j) => ({ a:points[j], b:p, length:Math.hypot(p[0]-points[j][0],p[1]-points[j][1]) }));
    const segment = segments.sort((a,b)=>b.length-a.length)[0];
    const mid = [(segment.a[0]+segment.b[0])/2,(segment.a[1]+segment.b[1])/2];
    const labelWidth = label.length*5.6+12;
    const verticalSegment = Math.abs(segment.a[0]-segment.b[0]) < 30;
    const rotate = verticalSegment ? segment.length > 150 : segment.length < labelWidth;
    svg += '<g transform="translate('+mid[0]+' '+(mid[1]-9)+')'+(rotate?' rotate(-90)':'')+'"><rect x="'+(-labelWidth/2)+'" y="-12" width="'+labelWidth+'" height="17" fill="white"/>'+text(0,0,label,11,'middle')+'</g>';
    cells += '<mxCell id="e' + i + '" value="' + esc(label) + '" style="edgeStyle=orthogonalEdgeStyle;html=1;rounded=0;endArrow=' + (dependency ? 'open;dashed=1' : 'none') + ';strokeColor=#1A1612;fontColor=#1A1612;labelBackgroundColor=#FFFFFF;" edge="1" parent="1" source="' + a + '" target="' + b + '"><mxGeometry relative="1" as="geometry">' + (via ? '<Array as="points">' + via.map(([x,y]) => '<mxPoint x="'+x+'" y="'+y+'"/>').join('') + '</Array>' : '') + '</mxGeometry></mxCell>';
  }
  for (const n of nodes) {
    svg += '<rect x="'+n.x+'" y="'+n.y+'" width="'+n.w+'" height="'+n.h+'" fill="white" stroke="#1A1612" stroke-width="1.4"/>' + text(n.x+n.w/2,n.y+21,'«'+n.kind+'»',11,'middle') + text(n.x+n.w/2,n.y+43,n.name,15,'middle',true) + '<line x1="'+n.x+'" y1="'+(n.y+54)+'" x2="'+(n.x+n.w)+'" y2="'+(n.y+54)+'" stroke="#1A1612"/>';
    n.lines.forEach((line, i) => { svg += text(n.x+12,n.y+78+i*18,line,12); });
    const value = '<div style="text-align:center;padding:6px">«'+esc(n.kind)+'»<br/><b>'+esc(n.name)+'</b></div><hr/>'+n.lines.map(esc).join('<br/>');
    cells += '<mxCell id="'+n.id+'" value="'+esc(value)+'" style="rounded=0;html=1;whiteSpace=wrap;fillColor=#FFFFFF;strokeColor=#1A1612;fontColor=#1A1612;align=left;verticalAlign=top;spacing=9;fontFamily=Arial;fontSize=13;" vertex="1" parent="1"><mxGeometry x="'+n.x+'" y="'+n.y+'" width="'+n.w+'" height="'+n.h+'" as="geometry"/></mxCell>';
  }
  svg += text(36,h-25,nodes===app?'Dashed arrows: source-code dependencies. Module denotes exported domain functions.':'Associations show foreign keys; ReferralLink.customCouponCode is a business reference, not a Coupon FK.',12) + '</svg>';
  fs.writeFileSync(path.join(out,file+'.svg'),svg);
  return '<diagram name="'+esc(title)+'"><mxGraphModel page="1" pageWidth="'+w+'" pageHeight="'+h+'" background="#FFFFFF"><root>'+cells+'</root></mxGraphModel></diagram>';
}
const appEdges = [ ['pc','ps','delegates'],['ac','as','delegates'],['dc','ds','delegates'],['mc','ms','delegates'],['ds','da','atomic decision'],['da','rs','transaction-bound issuance'],['da','cg','after commit',[[1050,575],[630,575]]],['ps','db','persistence',[[410,448],[410,948]]],['as','db','persistence',[[850,448],[850,948]]],['ms','db','persistence'],['as','ca','private cache',[[410,448],[410,1197]]] ];
appEdges.push(['ppc','pps','delegates'], ['pps','db','transaction'], ['ps','sem','semantic preflight']);
const modelEdges = [ ['st','us','0..1 store / 0..* staff'],['st','pr','1 store / 0..* products',[[390,84],[1050,84]]],['st','sc','1 store / 0..* partnerships'],['us','de','1 creator / 0..* proposals'],['pr','de','1 product / 0..* proposals'],['de','rl','0..1 / 0..1 VIP link'],['co','cm','1 conversation / 0..* messages'],['st','co','1 store / 0..* conversations',[[20,215],[20,745]]],['pr','ma','0..1 product / 0..* media',[[1250,215],[1250,1010]]],['rl','cu','coupon code lookup (no FK)'] ];
modelEdges.push(['de','ep','1 / 0..* resources'], ['pr','ep','1 / 0..* scopes'], ['pr','pv','1 / 0..* SKUs'], ['pr','pm','1 / 0..* promotions'], ['pm','pu','1 / 0..* usages'], ['od','pu','1 / 0..* budget records']);
appEdges.push(['ps','pi','identity guard',[[20,448],[20,1080],[630,1080]]], ['dp','db','read snapshot',[[1050,1070],[630,1070]]]);
const arrange = (ids, source, height = 210) => ids.map((id,i) => ({...source.find(node => node.id===id),x:40+(i%3)*420,y:110+Math.floor(i/3)*265,h:height}));
const core = arrange(['st','us','pr','sc','de','rl','co','cm','cu','ma'],domain);
core[9].x=460;
const baseApp = arrange(['pc','ac','dc','ps','as','ds','mc','cg','da','ms','db','rs','ca','pi','dp'],app,175);
// Preserve the original application page spacing used by its explicit edge gutters.
baseApp.forEach((node,i)=>{node.y=110+Math.floor(i/3)*250;});
const originalEdges = appEdges.filter(edge=>baseApp.some(n=>n.id===edge[0])&&baseApp.some(n=>n.id===edge[1]));
const pricingApp=arrange(['ppc','sem','ps','pps','db','pi'],app,175);
const contract=arrange(['st','de','ep','cu','rl','pr'],domain);
const pricing=arrange(['pr','pv','pm','od','pu','us'],domain);
const coreEdges=modelEdges.filter(edge=>core.some(n=>n.id===edge[0])&&core.some(n=>n.id===edge[1]));
const contractEdges=[['st','de','1 store / 0..* contracts'],['de','ep','1 contract / 0..* products'],['ep','pr','1 product / 0..* bindings'],['de','rl','1 contract / 0..1 primary link'],['st','cu','1 store / 0..* coupons'],['rl','cu','code lookup (no FK)']];
const pricingEdges=[['pr','pv','1 product / 0..* SKUs'],['pv','pm','0..1 SKU / 0..* promotions'],['pr','pm','1 product / 0..* promotions',[[210,84],[1050,84]]],['pm','pu','1 promotion / 0..* usages',[[1050,350],[630,350]]],['od','pu','1 order / 0..* usages'],['us','pm','requester / reviewer']];
fs.writeFileSync(path.join(out,'Class-Diagram.drawio'),'<mxfile host="app.diagrams.net">'+classPage('Application Class Diagram',baseApp,originalEdges,'class-application')+classPage('Domain Class Diagram',core,coreEdges,'class-domain')+classPage('Pricing Application Classes',pricingApp,[['ppc','pps','delegates'],['ps','sem','local inference'],['ps','pi','identity guard'],['pps','db','transaction']], 'class-pricing-application')+classPage('VIP Scope and Resource Classes',contract,contractEdges,'class-contract')+classPage('Pricing and Promotion Classes',pricing,pricingEdges,'class-pricing')+'</mxfile>');

function sequence(title, participants, messages, file) {
  const w = Math.max(1150,participants.length*210), h = 210+messages.length*76;
  const xs = participants.map((_,i) => 110+i*(w-220)/(participants.length-1));
  let svg=header(w,h,title,'SCANMS | As implemented; role guards and input validation precede controller execution.');
  let cells='<mxCell id="0"/><mxCell id="1" parent="0"/>';
  participants.forEach((name,i) => {
    svg += '<rect x="'+(xs[i]-85)+'" y="85" width="170" height="48" fill="white" stroke="#1A1612"/>'+text(xs[i],114,name,13,'middle',true)+'<line x1="'+xs[i]+'" y1="133" x2="'+xs[i]+'" y2="'+(h-35)+'" stroke="#7D715E" stroke-dasharray="6 5"/>';
    cells += '<mxCell id="p'+i+'" value="'+esc(name)+'" style="shape=umlLifeline;html=1;perimeter=lifelinePerimeter;whiteSpace=wrap;fillColor=#FFFFFF;strokeColor=#1A1612;fontColor=#1A1612;size=48;" vertex="1" parent="1"><mxGeometry x="'+(xs[i]-85)+'" y="85" width="170" height="'+(h-120)+'" as="geometry"/></mxCell>';
  });
  messages.forEach(([from,to,label,response=false],i) => {
    const y=190+i*76; const x1=xs[from],x2=xs[to];
    svg += '<line x1="'+x1+'" y1="'+y+'" x2="'+x2+'" y2="'+y+'" stroke="#1A1612" stroke-width="1.4" marker-end="url(#arrow)"'+(response?' stroke-dasharray="5 4"':'')+'/>'+text((x1+x2)/2,y-12,(i+1)+'. '+label,12,'middle');
    cells += '<mxCell id="m'+i+'" value="'+esc((i+1)+'. '+label)+'" style="html=1;endArrow=open;strokeColor=#1A1612;fontColor=#1A1612;labelBackgroundColor=#FFFFFF;'+(response?'dashed=1;':'')+'" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="'+x1+'" y="'+y+'" as="sourcePoint"/><mxPoint x="'+x2+'" y="'+y+'" as="targetPoint"/></mxGeometry></mxCell>';
  });
  fs.writeFileSync(path.join(out,file+'.svg'),svg+'</svg>');
  return '<diagram name="'+esc(title)+'"><mxGraphModel page="1" pageWidth="'+w+'" pageHeight="'+h+'" background="#FFFFFF"><root>'+cells+'</root></mxGraphModel></diagram>';
}
const sequences = [
  ['Product Submission and Moderation',['Shop / Reviewer','Product UI','ProductsController','ProductsService','Prisma / PostgreSQL'],[
    [0,1,'Submit product in assigned category'],[1,2,'GET /api/products/identity-check'],[2,3,'findSimilarProducts(actor, role, query)'],[3,4,'Own drafts + public approved catalogue'],[4,1,'Local ONNX cosine >80; user confirms',true],
    [1,2,'POST /api/products'],[2,3,'create(actorId, role, dto)'],[3,4,'Resolve owned or assigned store'],[4,3,'Store and fixed category',true],
    [3,2,'[invalid category/evidence] reject 400',true],[3,4,'BEGIN; lock SKU/barcode; reject duplicates'],[3,4,'[valid] same transaction: product, variants, media'],[4,1,'COMMIT: DRAFT; not publicly approved',true],
    [0,1,'System Manager reviews submission'],[1,2,'PATCH /api/products/:id/moderation'],[2,3,'moderateProduct(actorId, id, dto)'],[3,4,'Transaction: status + audit + notification'],[4,1,'APPROVED or REJECTED with reason',true],
  ],'sequence-product'],
  ['KOC Recommendation and Private Cache',['Shop','AI Drawer','AI Controller','AI Service','Cache','Prisma / PostgreSQL'],[
    [0,1,'Open drawer without losing product context'],[1,2,'GET /api/ai/recommend-kols/:productId'],[2,3,'getRecommendedKols(query, actor)'],[3,5,'Read approved product; verify store access'],[5,3,'Product and current authorization',true],
    [3,1,'[foreign store] 403; never read cache',true],[3,4,'[authorized] key: actor + ALL filters'],[4,3,'Cached result or miss',true],[3,5,'[miss] verified profiles, valid clicks, sales'],[5,3,'Measured facts; no fabricated fallback',true],[3,4,'Cache cold-start/performance scores'],[3,1,'Top KOCs, evidence and data confidence',true],
  ],'sequence-ai'],
  ['VIP Scopes and Independent Exception Approval',['Shop / KOC','VIP Form','DealsController','DealsService','Activation policy','PostgreSQL','Referral service','Socket.IO','Admin'],[
    [0,1,'Choose scope, revenue KPI, rate 10-25%'],[1,2,'POST /offers OR /proposals'],[2,3,'Validate Store, KYC and scope'],[3,5,'Lock Store/KOC; persist pending card'],[3,7,'After commit: new_message'],
    [0,1,'Recipient accepts immutable terms'],[1,2,'PATCH /accept OR /approve'],[2,4,'decideExclusiveDeal'],[4,5,'BEGIN; re-read state and actor rights'],
    [4,5,'[rate >16] PENDING_ADMIN_APPROVAL'],[4,8,'[rate >16] Notify independent Admin'],[8,2,'PATCH /:id/exception-review'],[2,4,'Admin role, reason, maker-checker'],
    [4,5,'[<=16 OR Admin approves] APPROVED'],[4,6,'Issue scoped links in caller transaction'],[6,5,'Link records and resource bindings'],[4,5,'Coupon, KPI clock, audit, chat; close prior scope'],[5,4,'COMMIT; any error rolls back ALL',true],[4,7,'After commit: decision and resources'],[7,1,'Authoritative status; no duplicate issuance',true],
  ],'sequence-vip'],
  ['MAP and Budgeted Price Promotion',['Shop','Pricing UI','PricingController','PricingService','PostgreSQL','Scheduler','Checkout'],[
    [0,1,'Submit price, SKU, schedule, budget'],[1,2,'POST /pricing/promotions'],[2,3,'Validate Store and MAP'],[3,4,'PENDING + audit + reviewer notification'],[1,2,'Reviewer: PATCH /:id/review'],[2,3,'Maker-checker and schedule overlap check'],[3,4,'APPROVED; activate if start is due'],[5,3,'Every 30 seconds: reconcileDue'],[3,4,'Apply SKU prices or restore MSRP'],[6,4,'BEGIN; lock product rows'],[6,4,'Validate net-goods MAP and current price'],[6,4,'Conditional budget reservation + usage + order'],[4,6,'COMMIT or rollback stock/order/budget',true],[6,4,'Cancellation: release usage once'],
  ],'sequence-pricing'],
  ['Media Hub Access and Download',['KOC / Staff','Media Hub UI','MediaController','MediaService','Prisma / PostgreSQL','ZIP builder'],[
    [0,1,'Open marketing?tab=media'],[1,2,'GET /api/media (paged)'],[2,3,'findAll(query, viewer)'],[3,4,'Current partnership / assigned store scope'],[4,3,'Authorized store IDs (before cache)',true],[3,4,'Approved assets or own submissions'],[3,1,'Complete paginated collection',true],
    [0,1,'Select filters and download pack'],[1,5,'buildMediaPack(filteredAssets)'],[5,1,'ZIP: files, scripts, manifest and source links',true],[1,0,'Download; report failed/streaming sources',true],
  ],'sequence-media'],
];
fs.writeFileSync(path.join(out,'Sequence-Diagram.drawio'),'<mxfile host="app.diagrams.net">'+sequences.map(args=>sequence(...args)).join('')+'</mxfile>');
console.log('Generated 2 draw.io documents and 10 SVG pages in '+out);
