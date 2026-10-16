const path=require('path');
const D=require('./drawio-monochrome.cjs');
const d=new D();
d.text('FR-12 | Assign Personal Coupon - Class Diagram',35,20,2500,45,'fontSize=29;fontStyle=1;');
d.text('Current web: KOL proposes a code, Shop approves the discount policy, customer redeems it; OrdersService attributes the order to the coupon owner.',35,75,2500,30,'fontSize=17;');
const kol=d.cls('<<React component>> KolCouponsPage',['selectedStoreId: string','proposeCode: string; isCodeValid: boolean'],['handleProposeSubmit(event)','handleCopy(code); handleTogglePause(coupon)','fetchCoupons(); fetchApprovedStores()'],35,145,450);
const shop=d.cls('<<React component>> ShopCouponsPage',['storeId: string','selectedCouponToApprove: CouponItem | null','approveForm: ApproveCouponPayload'],['handleOpenApproveModal(coupon)','handleApproveSubmit(event)','handleRejectSubmit(event)','fetchStoreCoupons(storeId)'],35,490,450);
const checkout=d.cls('<<React component>>\nGuestCheckoutModal',['couponCode: string; appliedCoupon','couponMessage; targetVoucherStoreId'],['handleValidateCoupon()','handleRemoveCoupon()','handleSubmitOrder(event)'],35,900,450);
const client=d.cls('<<service object>> couponService',[],['proposeCoupon(payload)','approveCoupon(storeId, couponId, payload)','getStoreCoupons(storeId); getKolCoupons(params?)','togglePauseCoupon(id); deleteCoupon(id)'],585,145,470);
const cc=d.cls('<<NestJS controller>>\nCollaboratorCouponsController',['- service: CouponsService'],['proposeCoupon(collaboratorId, dto, ip)','getEligibleStores(collaboratorId)'],1160,145,465);
const sc=d.cls('<<NestJS controller>>\nStoreCouponsController',['- service: CouponsService'],['approveCoupon(storeId, id, userId, role, dto, ip)','rejectCoupon(...); updatePolicy(...)'],1160,440,465);
const pc=d.cls('<<NestJS controller>>\nPublicCouponsController',['- service: CouponsService'],['validateCoupon(dto, ipAddress, req)'],585,900,470);
const oc=d.cls('<<NestJS controller>> OrdersController',['- ordersService: OrdersService'],['createOrder(dto, request context)'],585,1190,470);
const service=d.cls('<<NestJS service>> CouponsService',['- prisma: PrismaService','- cacheService: CacheService'],['getEligibleStores(collaboratorId)','proposeCoupon(collaboratorId, dto, ip?)','approveCoupon(storeId, id, userId, role, dto, ip?)','validateCoupon(dto, ip?, sessionId?, userId?)','normalizeAndValidateCode(rawCode): string','createNotification(userId, title, message, type, data?)','- verifyStoreAccess(storeId, userId, role)','- checkRateLimit(key, max, windowMs, ...)'],1740,440,555);
const os=d.cls('<<NestJS service>> OrdersService',['- prisma: PrismaService','- couponsService: CouponsService'],['createOrder(dto, clientContext)','- executeStoreOrderInTransaction(...)'],1160,1045,465);
const dto=d.cls('<<DTO>> CreateCouponDto',['storeId: UUID','code: string [4..20 alphanumeric, has letter]','campaignId?: UUID'],[],2390,145,560);
const adto=d.cls('<<DTO>> ApproveCouponDto',['discountType: DiscountType; discountValue: number','minimumOrderAmount?; maximumDiscountAmount?','usageLimitTotal?; usageLimitPerCustomer?','budgetTotal?; startsAt?; expiresAt?','scopeType?; productIds?; categoryNames?','fundingSource?; shopFundingRate?; platformFundingRate?','stackableWithProductDiscount?','stackableWithShopVoucher?; stackableWithPlatformVoucher?'],[],2390,430,560);
const vdto=d.cls('<<DTO>> ValidateCouponDto',['code: string; storeId?: UUID','customerPhone?: string','items: CartItemValidateDto[]','hasProductDiscount?; hasShopVoucher?','hasPlatformVoucher?: boolean'],[],2390,850,560);
const prisma=d.cls('<<infrastructure>> PrismaService',[],['coupon / couponRedemption / order','storeCollaborator / commissionRule','couponProduct / couponCategory','user / store / product / productVariant','auditLog / notification / $transaction'],1740,1100,555);
d.text('CacheService: request limits, validation failure counters and temporary lockout. Public validation response omits collaboratorId; order creation uses the internal result.',35,1450,2900,35,'fontSize=18;');
d.edge(kol,client,[485,240],[585,240],['calls',491,208,85]);
d.edge(shop,client,[485,590],[820,321],['calls',690,350,100],[[820,590]]);
d.edge(client,cc,[1055,240],[1160,240],['HTTP POST',1060,208,95]);
d.edge(client,sc,[1055,285],[1160,525],['HTTP PATCH',1060,370,95],[[1110,285],[1110,525]]);
d.edge(cc,service,[1625,240],[1740,510],['delegates',1630,355,100],[[1680,240],[1680,510]]);
d.edge(sc,service,[1625,525],[1740,590],['delegates',1630,555,100],[[1680,525],[1680,590]]);
d.edge(checkout,pc,[485,990],[585,990],['POST validate',490,958,90]);
d.edge(checkout,oc,[485,1090],[585,1270],['POST orders',490,1200,90],[[530,1090],[530,1270]]);
d.edge(pc,service,[1055,990],[1740,740],['validateCoupon',1310,955,180],[[1690,990],[1690,740]]);
d.edge(oc,os,[1055,1270],[1160,1230],['delegates',1060,1290,95],[[1110,1270],[1110,1230]]);
d.edge(os,service,[1625,1120],[1740,770],['revalidate',1630,1000,95],[[1710,1120],[1710,770]]);
d.edge(service,prisma,[2000,790],[2000,1100],['queries / writes',2015,975,180]);
d.edge(service,dto,[2295,490],[2390,240],['uses DTO',2300,290,85],[[2340,490],[2340,240]]);
d.edge(service,adto,[2295,590],[2390,590],['uses DTO',2300,558,85]);
d.edge(service,vdto,[2295,710],[2390,950],['uses DTO',2300,800,85],[[2340,710],[2340,950]]);
d.text('DOMAIN MODEL - selected fields and persisted relations',35,1520,2900,40,'fontSize=25;fontStyle=1;');
const user=d.cls('User',['id: UUID [PK]','role: UserRole; isActive / isDeleted: boolean'],[],35,1620,430);
const store=d.cls('Store',['id: UUID [PK]; ownerId: UUID [FK]','isDeleted: boolean','defaultCommissionRate: Decimal'],[],35,1900,430);
const collab=d.cls('StoreCollaborator',['id: UUID [PK]','storeId / collaboratorId: UUID [FK]','status: StoreCollaboratorStatus','unique(storeId, collaboratorId)'],[],35,2200,430);
const coupon=d.cls('Coupon',['id: UUID [PK]','codeNormalized: string [unique]','displayCode: string','collaboratorId / storeId: UUID [FK]','campaignId?: UUID [FK]','status: CouponStatus = PENDING_APPROVAL','discountType: DiscountType; discountValue: Decimal','minimumOrderAmount?; maximumDiscountAmount?','usageLimitTotal?; usageLimitPerCustomer: int','usageCount: int; budgetTotal?; budgetUsed: Decimal','startsAt / expiresAt: DateTime?; scopeType: CouponScope','fundingSource; shopFundingRate; platformFundingRate','stackableWithProductDiscount/ShopVoucher/PlatformVoucher','approvedBy?: UUID [FK -> User]; approvedAt?: DateTime','rejectedReason?; blockedReason?; deletedAt?: DateTime'],[],650,1620,700);
const order=d.cls('Order',['id: UUID [PK]; storeId: UUID [FK]','couponId?: UUID [FK]','attributedCollaboratorId?: UUID [FK -> User]','attributionMethod?: AttributionMethod','couponCodeSnapshot?: string','couponDiscountAmount?: Decimal','finalAmount: Decimal; status: OrderStatus'],[],1510,1620,560);
const redemption=d.cls('CouponRedemption',['id: UUID [PK]','couponId: UUID [FK]; orderId: UUID [FK, unique]','collaboratorId / storeId: UUID [indexed scalar]','status: CouponRedemptionStatus','discountAmount / eligibleSubtotal: Decimal','shopFundedAmount / platformFundedAmount: Decimal','couponCodeSnapshot; discountType/ValueSnapshot'],[],1510,2070,560);
const cp=d.cls('CouponProduct',['id: UUID [PK]','couponId / productId: UUID [FK]','unique(couponId, productId)'],[],650,2210,335);
const cat=d.cls('CouponCategory',['id: UUID [PK]','couponId: UUID [FK]','categoryName: string'],[],1035,2210,315);
const campaign=d.cls('Campaign',['id: UUID [PK]','storeId: UUID [FK]','isActive; startDate / endDate'],[],2260,1620,690);
const audit=d.cls('AuditLog',['id: UUID [PK]; userId?: UUID [FK]','action: string; details: Json?','ipAddress?: string'],[],2260,1900,690);
const notification=d.cls('Notification',['id: UUID [PK]; userId: UUID [FK]','title / message / type: string','data?: Json'],[],2260,2200,690);
// Multiplicities at each end, solid associations for persisted model relations.
function assoc(a,b,p,q,left,right,pts=[]){d.edge(a,b,p,q,null,pts,false);d.text(left,...[p[0]+8,p[1]-32],80,24,'fontSize=15;');d.text(right,q[0]-76,q[1]-32,70,24,'fontSize=15;align=right;');}
assoc(user,coupon,[465,1690],[650,1690],'1','0..*');
assoc(store,coupon,[465,1980],[650,1980],'1','0..*');
assoc(store,collab,[245,store.y+store.h],[245,2200],'1','0..*');
assoc(coupon,order,[1350,1730],[1510,1730],'0..1','0..*');
assoc(order,redemption,[1790,1874],[1790,2070],'1','0..1');
assoc(coupon,redemption,[1350,2010],[1510,2160],'1','0..*',[[1420,2010],[1420,2160]]);
assoc(coupon,cp,[820,2082],[820,2210],'1','0..*');
assoc(coupon,cat,[1190,2082],[1190,2210],'1','0..*');
assoc(coupon,campaign,[1350,1660],[2260,1660],'0..*','0..1',[[1430,1660],[1430,1585],[2195,1585],[2195,1660]]);
d.text('Additional FKs: StoreCollaborator -> User; Coupon.approvedBy -> User; Order.attributedCollaboratorId -> User; CouponProduct -> Product; Store -> User owner.',35,2460,2900,30,'fontSize=17;');
d.text('AuditLog and Notification reference User. Their JSON data/details contain couponId; neither has a Coupon foreign key. Category scope stores categoryName, not a Category FK.',35,2500,2900,30,'fontSize=17;');
d.text('Scope: personal KOL coupon proposal, approval and redemption. Platform/shipping vouchers, Live session vouchers, refunds and commission payouts are separate flows.',35,2540,2900,30,'fontSize=17;');
D.save(path.join(__dirname,'FR12_Assign_Personal_Coupon_Class_Diagram.drawio'),[d.page('FR-12 - Assign Personal Coupon - Classes',3000,2600)]);
// Three compact sequence pages in one file; each represents an independent request flow.
const pages=[];
function seq(title,names,actor){const s=new D();s.text('FR-12 | '+title,25,15,1450,38,'fontSize=25;fontStyle=1;');const xs=[80,350,650,980,1320];for(const x of xs)s.line([x,135],[x,890],'endArrow=none;dashed=1;');s.box(actor,64,75,32,38,'shape=umlActor;fillColor=#FFFFFF;strokeColor=#000000;verticalLabelPosition=bottom;verticalAlign=top;fontSize=13;');names.forEach((v,i)=>s.box(v,xs[i+1]-(i===1?145:125),86,i===1?290:250,49,'fillColor=#FFFFFF;strokeColor=#000000;align=center;fontSize=13;fontStyle=1;whiteSpace=wrap;'));let n=0;return {s,xs,msg(a,b,y,v,ret=false){s.line([xs[a],y],[xs[b],y],`endArrow=${ret?'open':'block'};endFill=${ret?0:1};${ret?'dashed=1;':''}`);s.text(`${++n}. ${v}`,Math.min(xs[a],xs[b])+10,y-28,Math.abs(xs[a]-xs[b])-20,25,'fontSize=13;align=center;');},self(a,y,v){s.line([xs[a]+5,y],[xs[a]+5,y+16],'endArrow=block;endFill=1;',[[xs[a]+55,y],[xs[a]+55,y+16]]);s.text(`${++n}. ${v}`,xs[a]+70,y-22,330,38,'fontSize=13;');},bar(a,y,h){s.box('',xs[a]-5,y,10,h,'fillColor=#FFFFFF;strokeColor=#000000;');},finish(name,notes){notes.forEach((v,i)=>s.text(v,25,922+i*34,1440,29,'fontSize=13;'));pages.push(s.page(name,1500,1080,1));}};}
{
const q=seq('01 - KOL Proposes a Personal Coupon',['KolCouponsPage','CollaboratorCouponsController','CouponsService','Prisma / PostgreSQL'],'KOL');
q.bar(1,175,630);q.bar(2,275,480);q.bar(3,320,390);
q.msg(0,1,175,'Choose Shop; enter THANGVIP10');
q.s.note('ref  GET /api/collaborator/coupons/eligible-stores: approved partnerships with a commission policy. UI validates the code.',370,195,1040,42);
q.msg(1,2,275,'POST /api/collaborator/coupons');q.msg(2,3,320,'proposeCoupon(user.id, dto, ip)');
q.s.note('ref  Rate limits 5/min + 20/day; normalize code; validate account/Shop, APPROVED partnership, commission policy, quotas and global uniqueness.',660,345,750,54);
q.s.box('',35,425,1400,90,'fillColor=none;strokeColor=#000000;');q.s.text('break [invalid / forbidden / duplicate / quota or rate limit]',45,427,1320,24,'fontStyle=1;fontSize=13;');q.msg(3,1,495,'Error via controller/client; keep form and display error',true);
q.msg(3,4,565,'Create Coupon: PENDING_APPROVAL');q.msg(4,3,605,'Coupon associated with KOL + Store',true);
q.msg(3,4,660,'Audit COUPON_PROPOSED; notify Shop owner');q.msg(3,2,710,'Coupon + pending-approval message',true);q.msg(2,1,755,'201 Created via couponService',true);q.msg(1,0,805,'Show success; refresh coupon list',true);
q.finish('01 - KOL proposal',['Code: 4-20 letters/digits, at least one letter, uppercase normalized; reserved words forbidden. The UI sends storeId + code.','Pending limits: 5/Shop, 20 globally; ACTIVE limits: 10/Shop, 100 globally per KOL. Soft-deleted codes remain reserved by unique codeNormalized.','Coupon creation, audit and notification are sequential; proposal is not wrapped in a transaction. Notification failures are logged.']);
}
{
const q=seq('02 - Shop Approves and Activates the Coupon',['ShopCouponsPage','StoreCouponsController','CouponsService','Prisma / PostgreSQL'],'Shop Manager');
q.bar(1,175,630);q.bar(2,275,480);q.bar(3,320,390);
q.msg(0,1,175,'Select pending coupon; set discount');q.s.note('Policy: percent/fixed discount, minimum order, maximum discount, usage limits, budget, scope and stacking flags.',370,195,1040,42);
q.msg(1,2,275,'PATCH .../coupons/:id/approve');q.msg(2,3,320,'approveCoupon(storeId, id, user, role, dto, ip)');
q.msg(3,4,365,'Verify Store access; read pending coupon');
q.s.box('',35,415,1400,90,'fillColor=none;strokeColor=#000000;');q.s.text('break [not authorized / not pending / invalid policy]',45,417,1320,24,'fontStyle=1;fontSize=13;');q.msg(3,1,485,'Error via controller/client; display approval error',true);
q.msg(3,4,555,'Transaction: policy + scope; status ACTIVE');q.msg(4,3,605,'Commit + approved coupon',true);q.msg(3,4,660,'Audit COUPON_APPROVED; notify KOL');q.msg(3,2,710,'Approved coupon + message',true);q.msg(2,1,755,'200 OK via couponService',true);q.msg(1,0,805,'Close approval form; refresh list',true);
q.finish('02 - Shop approval',['JWT/role guards and DTO validation run before private controller methods. Service verifies ownership; admins may also access.','Shop can approve SHOP_FUNDED only; platform/co-funding needs admin authority. Percentage is >0 and <=100; validate date order.','Only policy update and scope writes are transactional. Approval audit and KOL notification occur after commit. Reject/pause/delete are separate requests.']);
}
{
const q=seq('03 - Customer Redeems Code; Order Is Attributed',['GuestCheckoutModal','PublicCouponsController / OrdersController','CouponsService / OrdersService','Prisma / PostgreSQL'],'Customer');
q.bar(1,175,690);q.bar(2,220,220);q.bar(3,260,140);
q.msg(0,1,175,'Enter coupon; click Apply');q.msg(1,2,220,'POST /api/coupons/validate');q.msg(2,3,260,'CouponsService.validateCoupon(dto, context)');
q.msg(3,4,305,'Read coupon, scope, prices and customer usage');
q.s.note('ref  Validate status/dates, scope, quota, budget, customer limit and stacking; calculate discount from DB prices. Invalid coupon stops request.',660,325,750,48);
q.msg(3,2,400,'Discount + code; omit KOL ID in public response',true);q.msg(2,1,440,'Display applied discount',true);
q.msg(0,1,500,'Confirm order');q.msg(1,2,545,'POST /api/orders with coupon code');q.msg(2,3,590,'OrdersService.createOrder(dto, context)');
q.s.note('ref  Server revalidates coupon; begins order transaction; locks coupon FOR UPDATE and rechecks current policy, scope, limits and budget.',660,610,750,48);
q.msg(3,4,700,'Update usage/budget; save attributed Order + redemption');q.msg(4,3,745,'Commit; rollback if order transaction fails',true);q.msg(3,2,790,'Order result; attributionMethod = COUPON',true);q.msg(2,1,830,'Order confirmation',true);q.msg(1,0,875,'Show order success',true);
q.finish('03 - Redeem and attribute',['Controller/service pairs are combined to keep this overview readable. Preview validation does not consume quota or grant attribution by itself.','Coupon owner takes priority over cookie/fingerprint attribution. No prior click or QR scan is required for a valid personal coupon.','Single-Store example shown. UI also sends couponsByStore for multi-Store carts. Quota and CouponRedemption USED are written during order creation, not payment.']);
}
require('./build-reference-style-sequences.cjs').build('FR12');
console.log('Created FR-12 class diagram and single-page sequence lifecycle.');
