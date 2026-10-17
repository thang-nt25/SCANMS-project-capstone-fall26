const D = require('./drawio-monochrome.cjs');

module.exports = function drawFr12Overview() {
 const d = new D(), xs = [80, 320, 560, 870, 1300, 1740, 2200];
 const messages = [
  [0,3,'Choose Shop; propose personal code'],
  [3,4,'POST /collaborator/coupons'],
  [4,5,'proposeCoupon(user.id, dto, ip)'],
  [5,6,'Check account, partnership, policy, quotas and unique code'],
  [6,5,'Eligibility results',true],
  [5,6,'Create Coupon: PENDING_APPROVAL'],
  [6,5,'Created coupon',true],
  [5,6,'Write COUPON_PROPOSED audit; notify Shop'],
  [5,4,'Coupon + pending message',true],
  [4,3,'201 Created',true],
  [3,0,'Show pending coupon',true],
  [1,3,'Select coupon; set discount policy'],
  [3,4,'PATCH /stores/:storeId/coupons/:id/approve'],
  [4,5,'approveCoupon(storeId, id, user, role, dto, ip)'],
  [5,6,'Read Shop access and pending coupon'],
  [6,5,'Shop and coupon',true],
  [5,6,'Validate policy; transaction: save scope + ACTIVE'],
  [6,5,'Commit approved coupon',true],
  [5,6,'Write COUPON_APPROVED audit; notify KOL'],
  [5,4,'Approved coupon',true],
  [4,3,'200 OK',true],
  [3,1,'Show active coupon; refresh list',true],
  [2,3,'Enter coupon; click Apply'],
  [3,4,'POST /coupons/validate'],
  [4,5,'validateCoupon(dto, context)'],
  [5,6,'Read coupon, scope, prices and usage'],
  [6,5,'Coupon and cart data',true],
  [5,4,'Validate policy; return discount preview',true],
  [4,3,'Discount result (no KOL ID)',true],
  [3,2,'Show discount',true],
  [2,3,'Confirm checkout'],
  [3,4,'POST /orders with coupon code'],
  [4,5,'OrdersService.createOrder(dto, context)'],
  [5,6,'Transaction: lock/recheck coupon; save Order + USED redemption'],
  [6,5,'Commit usage, budget and coupon KOL attribution',true],
  [5,4,'Created order',true],
  [4,3,'201 Created + order',true],
  [3,2,'Show order confirmation',true]
 ];
 const first = 210, step = 49, last = first + (messages.length-1)*step;
 d.text('FR-12 | Personal Coupon: Propose, Approve and Redeem',25,14,2350,42,'fontSize=28;fontStyle=1;');
 d.text('One successful lifecycle. UI, controller and service lifelines group the components used in each stage. API paths use the /api prefix.',25,64,2350,36,'fontSize=16;');
 xs.forEach(x=>d.line([x,165],[x,last+45],'endArrow=none;dashed=1;'));
 ['KOL','Shop Manager','Customer'].forEach((name,i)=>d.box(name,xs[i]-16,110,32,40,'shape=umlActor;fillColor=#FFFFFF;strokeColor=#000000;verticalLabelPosition=bottom;verticalAlign=top;fontSize=16;'));
 ['Coupon Pages / Checkout','Coupon / Order Controllers','CouponsService / OrdersService','Prisma / PostgreSQL'].forEach((name,i)=>d.box(name,xs[i+3]-175,110,350,55,'fillColor=#FFFFFF;strokeColor=#000000;align=center;whiteSpace=wrap;fontStyle=1;fontSize=17;'));
 // Separate execution intervals for proposal, approval, preview and checkout.
 for(const [start,end] of [[0,10],[11,21],[22,29],[30,37]]){
  for(let lane=3;lane<=6;lane++){
   const incoming=messages.map((m,i)=>i>=start&&i<=end&&m[1]===lane&&!m[3]?i:-1).filter(i=>i>=0);
   if(!incoming.length)continue;
   const outgoing=messages.map((m,i)=>i>=incoming[0]&&i<=end&&m[0]===lane?i:-1).filter(i=>i>=0);
   const bottom=Math.max(...incoming,...outgoing);
   d.box('',xs[lane]-5,first+incoming[0]*step,10,(bottom-incoming[0])*step+4,'fillColor=#FFFFFF;strokeColor=#000000;');
  }
 }
 messages.forEach(([a,b,label,ret],i)=>{
  const y=first+i*step;
  d.line([xs[a]+(a>=3?5:0),y],[xs[b]+(b>=3?(b>a?-5:5):0),y],`endArrow=${ret?'open':'block'};endFill=${ret?0:1};${ret?'dashed=1;':''}`);
  d.text(`${i+1}. ${label}`,Math.min(xs[a],xs[b])+12,y-39,Math.abs(xs[a]-xs[b])-24,36,'align=center;fontSize=15;');
 });
 d.text('Pages: KolCouponsPage, ShopCouponsPage, GuestCheckoutModal. Controllers: CollaboratorCouponsController, StoreCouponsController, PublicCouponsController, OrdersController.',25,last+66,2350,40,'fontSize=16;');
 d.text('Proposal: rate limit + code normalization before eligibility checks. Approval: validate policy before saving. Preview consumes no quota. Checkout revalidates and gives the coupon KOL priority over cookie attribution; failures roll back the order transaction.',25,last+112,2350,52,'fontSize=16;');
 return d.page('FR-12 | Personal Coupon Lifecycle',2400,last+185,1);
};
