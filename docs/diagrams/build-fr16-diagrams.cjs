const path=require('path');
const D=require('./drawio-monochrome.cjs');
function classes(){
 const d=new D();
 d.text('FR-16 | Fast Checkout, Order Creation and Stock Deduction - Classes',35,20,3020,48,'fontSize=29;fontStyle=1;');
 d.text('Current web requires sign-in before submission, despite the GuestCheckoutModal name. Selected checkout dependencies and actual Prisma relationships.',35,80,3020,40,'fontSize=18;');
 const ui=d.cls('<<React component>> GuestCheckoutModal',['product?; store?; checkoutItems?: CartItem[]','customerName / Phone / Email; shippingAddress','provinceCode; districtCode; wardCode','appliedCoupon; policyAccepted; shippingFee','paymentMethod: PAYOS | WALLET','idempotencyKey; isSubmitting; orderSuccess'],['handleSubmitOrder(event)','handleValidateCoupon(); resolveOrderVariantId(item)','loadShippingAddresses() [imported function]'],35,165,600);
 const ctrl=d.cls('<<controller>> OrdersController',['- ordersService: OrdersService','- payosPaymentService: PayosPaymentService'],['validateCart(dto)','createOrder(dto, req, userId) [JwtAuthGuard]','createPayosLink(code, userId)','getPayosStatus(code, userId)'],795,165,550);
 const svc=d.cls('<<service>> OrdersService',['- prisma: PrismaService','- couponsService: CouponsService','- cacheService: CacheService','- walletsService: WalletsService','- checkoutMetrics: CheckoutMetricsService','- configService: ConfigService','- mailService?; - ghnService?'],['validateCart(dto); checkCreateOrderRateLimit(ip, phone)','createOrder(dto, clientContext?)','- createMultiStoreOrders(dto, products, context)','- executeStoreOrderInTransaction(tx, params)','- quoteCheckoutShipping(address, qty, subtotal, storeId)'],1505,165,700);
 const prisma=d.cls('<<infrastructure>> PrismaService',['product; productVariant; store; order','coupon; couponRedemption; stackedVoucherRedemption','attributionSession; paymentTransaction; notification'],['$transaction(callback, options)','$executeRaw: conditional UPDATE stock','$queryRaw: lock coupon FOR UPDATE'],2365,165,650);
 const dto=d.cls('<<DTO>> CreateOrderDto',['customerName; customerPhone; customerEmail?','shippingAddress; policyAccepted: true','storeId?; customerId? [overwritten from JWT]','couponCode?; couponsByStore?; platform/shipping codes?','paymentMethod?: COD | VIETQR | PAYOS | WALLET','orderNotes?; idempotencyKey: string','items: OrderItemInputDto[]'],[],35,830,600);
 const coupons=d.cls('<<service>> CouponsService',['prisma: PrismaService; cacheService: CacheService'],['validateCoupon(dto, ...context) [preview/precheck]'],795,830,550);
 const shipping=d.cls('<<service>> GhnService',[],['quoteAddress(address, weight, insuranceValue, storeId?)'],1505,830,700);
 const wallet=d.cls('<<service>> WalletsService',[],['debitAvailableBalanceForOrder(tx, userId, amount, orderId)'],2365,830,650);
 d.cls('<<DTO>> OrderItemInputDto',['productId: string; variantId?: UUID','quantity: number [integer >= 1 checked by service]','liveSessionId?: UUID; unitPrice? [ignored]'],[],35,1110,600);
 const payui=d.cls('<<React component>> PayosOrderPayment',['orderCode; link; qr; status'],['prepare() -> POST /orders/payos/:code/link','poll GET /orders/payos/:code/status','onPaid() callback'],35,1280,600);
 const pay=d.cls('<<service>> PayosPaymentService',[],['assertReady(); isAvailable()','createLink(publicCode, userId)','getStatus(publicCode, userId)','handleWebhook(body)'],795,1260,550);
 const cache=d.cls('<<service>> CacheService',[],['checkRateLimit(key, maxRequests, windowSeconds)','Create order: 30/IP/60s + 5/phone/300s'],1505,1260,700);
 const helper=d.cls('<<functions>> order-input.utils.ts',[],['validateCustomerName(); normalizeCustomerPhone()','validateShippingAddress(); validateOrderNotes()','computeOrderPayloadHash(dto, name, phone, method)','generateCryptographicOrderSn(); hashCancellationToken()'],2365,1260,650);
 d.text('DOMAIN MODEL - selected fields; solid lines are persisted associations',35,1650,3020,40,'fontSize=25;fontStyle=1;');
 const store=d.cls('Store',['id: UUID [PK]; name; slug','isActive; isDeleted; deletedAt?','policyReturn; policyWarranty; policyShipping'],[],35,1740,600);
 const product=d.cls('Product',['id: UUID [PK]; storeId: UUID [FK]','price: Decimal; stockQuantity: int','isActive; isDeleted; moderationStatus'],[],795,1740,550);
 const order=d.cls('Order',['id: UUID [PK]; storeId: UUID [FK]','customerId?: UUID [FK -> User]','externalOrderSn; idempotencyKey? [unique]','customerName / Phone / Email; shippingAddress','subtotalAmount / discountAmount / shippingFee / finalAmount','status: OrderStatus = PENDING','couponId?; referralLinkId? [FK]','rawPayload: Json? [payment status, requestHash]','policySnapshot?; attributionSnapshot?; cancellationToken?'],[],1505,1740,700);
 const item=d.cls('OrderItem',['id: UUID [PK]; orderId: UUID [FK]','productId: UUID [FK]; variantId?: UUID [FK]','quantity: int; unitPrice: Decimal','appliedCommissionRate; calculatedCommissionAmount'],[],2365,1740,650);
 const user=d.cls('User',['id: UUID [PK]','Current JWT user is the order customer','Order.customerId is nullable in schema'],[],35,2250,600);
 const variant=d.cls('ProductVariant',['id: UUID [PK]; productId: UUID [FK]','sku: string [unique]; price?: Decimal','stockQuantity: int; isActive: boolean'],[],795,2250,550);
 const coupon=d.cls('Coupon',['id: UUID [PK]; codeNormalized [unique]','status; usageCount; usageLimitTotal?','budgetUsed; budgetTotal?; discount rules'],[],1505,2340,700);
 const redemption=d.cls('CouponRedemption',['id: UUID [PK]; couponId: UUID [FK]','orderId: UUID [unique FK]','status = USED; discountAmount: Decimal','couponCodeSnapshot; customerPhone?'],[],2365,2250,650);
 const dep=(a,b,p,q,label,pts=[])=>d.edge(a,b,p,q,label,pts);
 dep(ui,ctrl,[635,290],[795,290],['POST /orders + JWT',640,250,150]);
 dep(ctrl,svc,[1345,290],[1505,290],['rate-limit / create',1350,250,150]);
 dep(svc,prisma,[2205,340],[2365,340],['atomic transaction',2210,300,150]);
 dep(ui,dto,[335,ui.y+ui.h],[335,830],['build payload',350,700,180]);
 dep(svc,shipping,[1855,svc.y+svc.h],[1855,830],['server GHN quote',1870,740,230]);
 dep(svc,coupons,[1505,510],[1345,910],['optional coupon',1350,735,145],[[1425,510],[1425,910]]);
 dep(svc,wallet,[2205,500],[2365,890],['wallet debit with tx',2210,710,150],[[2290,500],[2290,890]]);
 dep(ctrl,pay,[1070,ctrl.y+ctrl.h],[1070,1260],['PayOS readiness / link / status',1090,1130,245],[[1400,ctrl.y+ctrl.h],[1400,1200],[1070,1200]]);
 dep(payui,pay,[635,1360],[795,1360],['via OrdersController',640,1320,150]);
 const assoc=(a,b,p,q,l='1',r='0..*',pts=[])=>{d.edge(a,b,p,q,null,pts,false);d.text(l,p[0]+8,p[1]-31,70,24,'fontSize=16;');d.text(r,q[0]-74,q[1]-31,65,24,'fontSize=16;align=right;');};
 assoc(store,product,[635,1850],[795,1850]);
 assoc(product,variant,[1070,product.y+product.h],[1070,2250]);
 assoc(order,item,[2205,1850],[2365,1850]);
 assoc(item,variant,[2365,1900],[1345,2330],'0..*','0..1',[[2295,1900],[2295,2190],[1425,2190],[1425,2330]]);
 assoc(order,redemption,[2205,2000],[2365,2340],'1','0..1',[[2250,2000],[2250,2340]]);
 assoc(coupon,redemption,[2205,2390],[2365,2390]);
 d.text('Other FK links shown in fields: Store -> Order; User -> Order; Product -> OrderItem; optional Coupon -> Order. Product / variant stock is decremented conditionally, not both. No separate inventory table is used by this checkout path.',35,2620,3020,60,'fontSize=18;');
 d.text('Stock + order/items + coupon usage/redemptions + wallet debit share one transaction. Multi-Store checkout creates one Order per Store in one transaction. Payment method/status are stored in rawPayload; PENDING order status and PAID payment status are distinct.',35,2700,3020,60,'fontSize=18;');
 d.text('Supporting modules: CartProvider removes placed items after success; ShippingController quotes via GhnService; PublicCouponsController previews coupons; MailService sends optional confirmation after commit. Client prices and shipping totals are not authoritative.',35,2780,3020,60,'fontSize=18;');
 return d.page('FR-16 | Fast Checkout - Classes',3050,2870,0);
}
function sequence(){
 const d=new D(),xs=[80,440,940,1440,1950,2480,2950],w=3180;
 const m=[
 [0,1,'Open checkout from product page or cart'],
 [1,1,'Prefill saved data; generate idempotencyKey'],
 [1,2,'POST /orders/validate-cart (product, variant, quantity, price)'],
 [2,3,'validateCart(dto)'],[3,5,'Read current products / variants / stock'],[5,3,'Current cart values',true],[3,2,'Cart validation and warnings',true],[2,1,'Warnings for price, stock or availability',true],
 [0,1,'Sign in; enter recipient/address; accept policies'],
 [1,4,'Via ShippingController: GHN quote-address per Store'],[4,1,'Shipping fee preview / error',true],
 [1,4,'If coupon applied: public coupon validation'],[4,1,'Discount preview (no quota consumed)',true],
 [0,1,'Confirm order (PAYOS or WALLET)'],[1,1,'Validate form, auth, policies, fee and local stock'],
 [1,2,'POST /api/orders + JWT + cookies + idempotencyKey'],
 [2,4,'JwtAuthGuard; PayOS readiness if PAYOS; rate-limit'],
 [2,3,'createOrder(dto with customerId from JWT, context)'],
 [3,5,'Look up existing order by idempotencyKey'],[5,3,'Existing order / none',true],
 [3,3,'If replay: compare hash; return existing or 409'],
 [3,5,'For new order: load approved products + variants/Store'],[5,3,'Database prices and eligibility',true],
 [3,4,'For new order: coupon precheck + server GHN quote'],[4,3,'Validated coupon context and shipping fee',true],
 [3,5,'BEGIN transaction; execute per Store'],
 [3,5,'Conditional UPDATE stock_quantity - qty WHERE stock >= qty'],[5,3,'Affected rows; 0 => throw and ROLLBACK',true],
 [3,5,'If coupons: lock/recheck; update usage and budget'],
 [3,3,'Resolve KOL attribution; compute totals and snapshots'],
 [3,5,'Create PENDING Order + OrderItems; notify; redemptions'],
 [3,4,'If WALLET: debit balance using same tx client'],
 [4,5,'If WALLET: wallet/payment writes in same transaction'],
 [3,5,'COMMIT if all succeed; otherwise ROLLBACK all Stores'],
 [5,3,'Created order(s) and authoritative totals',true],
 [3,4,'After commit, if email: send confirmation asynchronously'],
 [3,2,'Public code(s), totals, payment state, tracking URL',true],
 [2,1,'201 Created (or matched replay response)',true],
 [1,1,'Remove placed cart items; save recent public code'],
 [1,0,'Show created order(s); WALLET paid / PAYOS awaiting payment',true],
 [1,6,'If PAYOS: mount PayosOrderPayment(orderCode)'],
 [6,2,'POST /orders/payos/:code/link; poll status'],
 [2,4,'PayosPaymentService.createLink / getStatus (owner checked)'],
 [4,2,'QR / checkout URL / authoritative payment state',true],
 [2,6,'Payment response',true],
 [6,0,'Show QR; update UI when payment confirmed',true]
 ];
 const first=215,step=59,last=first+(m.length-1)*step;
 d.text('FR-16 | Fast Checkout: Create Order and Deduct Stock',25,14,w-50,44,'fontSize=29;fontStyle=1;');
 d.text('Current web requires sign-in. One page; guarded calls show optional branches. Existing-order replay skips creation. Full PayOS webhook and refund workflows are outside this diagram.',25,67,w-50,37,'fontSize=17;');
 xs.forEach(x=>d.line([x,165],[x,last+45],'endArrow=none;dashed=1;'));
 d.box('Customer',64,110,32,40,'shape=umlActor;fillColor=#FFFFFF;strokeColor=#000000;verticalLabelPosition=bottom;verticalAlign=top;fontSize=16;');
 ['GuestCheckoutModal','OrdersController','OrdersService','Checkout Support Services','Prisma / PostgreSQL','PayosOrderPayment'].forEach((n,i)=>d.box(n,xs[i+1]-205,110,410,55,'fillColor=#FFFFFF;strokeColor=#000000;align=center;whiteSpace=wrap;fontStyle=1;fontSize=18;'));
 for(const [s,e] of [[0,12],[13,39],[40,m.length-1]])for(let l=1;l<xs.length;l++){
  const inc=m.map((v,i)=>i>=s&&i<=e&&v[1]===l&&!v[3]?i:-1).filter(i=>i>=0);if(!inc.length)continue;
  const out=m.map((v,i)=>i>=inc[0]&&i<=e&&v[0]===l?i:-1).filter(i=>i>=0);
  d.box('',xs[l]-5,first+inc[0]*step,10,(Math.max(...inc,...out)-inc[0])*step+20,'fillColor=#FFFFFF;strokeColor=#000000;');
 }
 m.forEach(([a,b,label,ret],i)=>{const y=first+i*step;if(a===b){d.line([xs[a]+5,y],[xs[a]+5,y+18],'endArrow=block;endFill=1;',[[xs[a]+48,y],[xs[a]+48,y+18]]);d.text(`${i+1}. ${label}`,xs[a]+60,y-29,415,49,'fontSize=16;');}else{d.line([xs[a]+(a?5:0),y],[xs[b]+(b?(b>a?-5:5):0),y],`endArrow=${ret?'open':'block'};endFill=${ret?0:1};${ret?'dashed=1;':''}`);d.text(`${i+1}. ${label}`,Math.min(xs[a],xs[b])+12,y-44,Math.abs(xs[a]-xs[b])-24,41,'fontSize=16;align=center;');}});
 d.text('Support lifeline groups JwtAuthGuard, PayosPaymentService, CacheService, CouponsService, GhnService, WalletsService and MailService. Shipping/coupon previews use their own controllers; they do not enter OrdersController.',25,last+65,w-50,48,'fontSize=17;');
 d.text('New single-Store order: transaction ReadCommitted, timeout 15s. Multi-Store: one suborder per Store in a shared transaction, timeout 25s. Inventory decreases during order creation, before PayOS payment; any transaction failure restores stock and prevents partial orders.',25,last+120,w-50,48,'fontSize=17;');
 d.text('Rate limit: 30 create attempts/IP/minute and 5/phone/5 minutes (except test mode). Client unit prices are ignored. Out-of-stock currently throws HTTP 400; changed replay payload 409; unauthenticated POST 401. Failed submission keeps the form and displays the server error.',25,last+175,w-50,48,'fontSize=17;');
 return d.page('FR-16 | Fast Checkout - Sequence',w,last+245,1);
}
D.save(path.join(__dirname,'FR16_Guest_Checkout_Class_Diagram.drawio'),[classes()]);
console.log('Created FR-16 class diagram.');
D.save(path.join(__dirname,'FR16_Guest_Checkout_Sequence_Diagram.drawio'),[sequence()]);
console.log('Created FR-16 single-page sequence diagram.');
