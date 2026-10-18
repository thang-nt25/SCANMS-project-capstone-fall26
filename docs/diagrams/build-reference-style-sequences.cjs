const path=require('path');
const D=require('./drawio-monochrome.cjs');
// A sequence in the supplied reference style: headers, lifelines,
// execution specifications and messages, without note/fragment rectangles.
function draw(title,actor,names,messages,caption){
 const d=new D(),w=1700,h=1200,xs=[80,...names.map((_,i)=>380+i*(1150/(names.length-1)))];
 const first=205,step=Math.min(61,790/Math.max(1,messages.length-1)),last=first+(messages.length-1)*step;
 d.text(title,25,14,1650,38,'fontSize=25;fontStyle=1;');
 d.text('Main successful interaction; conditional steps are labelled on their messages.',25,58,1650,26,'fontSize=14;');
 for(const x of xs)d.line([x,145],[x,last+42],'endArrow=none;dashed=1;');
 d.box(actor,64,80,32,40,'shape=umlActor;fillColor=#FFFFFF;strokeColor=#000000;verticalLabelPosition=bottom;verticalAlign=top;fontSize=14;');
 names.forEach((name,i)=>d.box(name,xs[i+1]-128,91,256,54,'fillColor=#FFFFFF;strokeColor=#000000;align=center;fontStyle=1;fontSize=13;whiteSpace=wrap;'));
 // A receiver stays active across its request/return interval. Render bars
 // behind arrows; self calls use a small nested execution specification.
 for(let lane=1;lane<xs.length;lane++){
  const receives=messages.map((m,i)=>m[1]===lane&&m[0]!==lane&&!m[3]?i:-1).filter(i=>i>=0);
  if(!receives.length)continue;
  const top=first+receives[0]*step;
  const sends=messages.map((m,i)=>m[0]===lane?i:-1).filter(i=>i>=receives[0]);
  const bottom=first+Math.max(receives.at(-1),...sends)*step+4;
  d.box('',xs[lane]-5,top,10,Math.max(24,bottom-top),'fillColor=#FFFFFF;strokeColor=#000000;');
 }
 messages.forEach((m,i)=>{
  const [a,b,label,ret=false,async=false]=m,y=first+i*step;
  if(a===b){
   d.line([xs[a]+5,y],[xs[a]+5,y+16],'endArrow=block;endFill=1;',[[xs[a]+58,y],[xs[a]+58,y+16]]);
   d.text(`${i+1}. ${label}`,xs[a]+70,y-23,Math.min(420,w-xs[a]-90),42,'fontSize=13;');
  }else{
   d.line([xs[a]+(a?5:0),y],[xs[b]+(b?(b>a?-5:5):0),y],`endArrow=${ret||async?'open':'block'};endFill=${ret||async?0:1};${ret?'dashed=1;':''}`);
   d.text(`${i+1}. ${label}`,Math.min(xs[a],xs[b])+14,y-35,Math.abs(xs[a]-xs[b])-28,32,'align=center;fontSize=13;');
  }
 });
 d.text(caption,25,1083,1650,77,'fontSize=14;');
 return d.page(title,w,h,1);
}
const definitions={
 FR12:{file:'FR12_Assign_Personal_Coupon_Sequence_Diagram.drawio',pages:[
 ['FR-12 | 01 - Propose Personal Coupon','KOL',['KolCouponsPage','CollaboratorCouponsController','CouponsService','Prisma / PostgreSQL'],[
  [0,1,'Choose approved Shop; enter coupon code'],[1,2,'POST /api/collaborator/coupons'],[2,3,'proposeCoupon(user.id, dto, ip)'],
  [3,3,'Check request limits; normalize and validate code'],[3,4,'Check account, Shop, partnership, policy, quotas and uniqueness'],[4,3,'Eligibility and quota results',true],
  [3,4,'Create Coupon: PENDING_APPROVAL'],[4,3,'Created personal coupon',true],[3,4,'Create COUPON_PROPOSED audit and Shop notification'],
  [3,2,'Coupon + pending-approval message',true],[2,1,'201 Created via couponService',true],[1,0,'Show success; refresh coupon list',true]
 ],'Eligible Shops are loaded separately through GET /api/collaborator/coupons/eligible-stores. Code: 4-20 letters/digits, has a letter, globally unique. Errors stop the request and appear in the form. Proposal/audit are sequential writes.'],
 ['FR-12 | 02 - Approve and Activate Coupon','Shop Manager',['ShopCouponsPage','StoreCouponsController','CouponsService','Prisma / PostgreSQL'],[
  [0,1,'Select pending coupon; configure discount policy'],[1,2,'PATCH .../coupons/:id/approve'],[2,3,'approveCoupon(storeId, id, user, role, dto, ip)'],
  [3,4,'Read Shop access and pending coupon'],[4,3,'Shop and coupon',true],[3,3,'Validate pending state, discount, dates and funding'],
  [3,4,'Transaction: save policy/scope; set ACTIVE'],[4,3,'Commit + approved coupon',true],[3,4,'COUPON_APPROVED audit; notify KOL'],
  [3,2,'Approved coupon + message',true],[2,1,'200 OK via couponService',true],[1,0,'Close form; refresh coupon list',true]
 ],'Shop approval uses /api/stores/:storeId/coupons/:id/approve. Shop funding only; admin authority is required for platform funding. Policy/scope writes share a transaction; audit and notification follow commit. Invalid requests show an error.'],
 ['FR-12 | 03 - Redeem Coupon and Attribute Order','Customer',['GuestCheckoutModal','PublicCouponsController / OrdersController','CouponsService / OrdersService','Prisma / PostgreSQL'],[
  [0,1,'Enter coupon and click Apply'],[1,2,'POST /api/coupons/validate'],[2,3,'validateCoupon(dto, request context)'],[3,4,'Read coupon, scope, prices and customer usage'],[4,3,'Coupon and eligible cart data',true],
  [3,3,'Validate policy and calculate discount'],[3,2,'Discount result; public response omits KOL ID',true],[2,1,'Display applied discount',true],
  [0,1,'Confirm checkout'],[1,2,'POST /api/orders with coupon code'],[2,3,'OrdersService.createOrder(dto, context)'],[3,3,'Revalidate coupon; choose coupon KOL over cookie'],
  [3,4,'Transaction: lock coupon; recheck limits; save Order + redemption'],[4,3,'Commit order, usage count and budget',true],[3,2,'Created order',true],[2,1,'Order confirmation',true],[1,0,'Show order success',true]
 ],'Coupon validation only previews the discount. Creating the order consumes quota and stores CouponRedemption USED; transaction failure rolls back. Controller/service pairs are combined here. Multi-Store checkout sends couponsByStore.']
 ]},
 FR13:{file:'FR13_Last_Click_Tracking_Cookie_Sequence_Diagram.drawio',pages:[
 ['FR-13 | 01 - Track Click and Set Last-Click Cookie','Visitor / Browser',['RedirectController','ReferralLinksService','CacheService','Prisma / PostgreSQL','ClickQueueService'],[
  [0,1,'GET /r/:shortCode'],[1,1,'Read visitor cookie, trusted IP, UA and consent'],[1,2,'handleRedirect(code, clientInfo)'],[2,3,'Check IP rate limits; read link cache'],[3,2,'Cached link or miss',true],
  [2,4,'If cache miss: read link + Product/Store/KOL'],[4,2,'Link and related records',true],[2,2,'Check eligibility; compute visitor/fingerprint hashes'],
  [2,4,'If eligible: upsert session by Store + visitor hash'],[4,2,'Last-Click session (failure disables attribution)',true],[2,5,'enqueue(click job: validity, risk, hashes, LINK/QR)',false,true],
  [2,1,'Destination + attribution/session result',true],[1,1,'If eligible session: sign cookie and set Max-Age'],[1,0,'302 to allowlisted product destination',true]
 ],'Frontend forwards the short URL to backend. Cookie default 30 days, per Shop 1-365. Missing/deleted link: 404; BLOCKED: 410. Bot, rate-limit, PAUSED/EXPIRED and opt-out do not set new attribution. Social crawlers receive Open Graph HTML.'],
 ['FR-13 | 02 - Write Click Log and Deduplicate','Worker Timer',['ClickQueueService','CacheService / Redis','Prisma / PostgreSQL'],[
  [0,1,'processQueue() every 1.5 seconds'],[1,2,'Lease Redis job, or read local memory job'],[2,1,'Pending click job',true],[1,3,'Check whether eventId already exists'],[3,1,'Idempotency result',true],
  [1,2,'If valid: SET unique-click key NX EX 1800'],[2,1,'Unique / repeated result',true],[1,3,'Transaction: counters + ClickTrafficLog'],[3,1,'Commit processed click',true],
  [1,2,'ACK Redis job after commit'],[1,0,'Worker pass completes',true]
 ],'Existing eventId is skipped. Without a Redis client, DB advisory locking provides dedup fallback. Failed jobs retry; Redis DLQ follows exhausted retries. Store subnet, normalized UA and hashes. Unique-click dedup is 30 minutes and is separate from Last-Click.'],
 ['FR-13 | 03 - Resolve KOL Attribution at Checkout','Customer / Browser',['GuestCheckoutModal','OrdersController','OrdersService','Prisma / PostgreSQL'],[
  [0,1,'Confirm checkout'],[1,2,'POST /api/orders + browser cookies'],[2,3,'createOrder(dto, clientContext)'],[3,4,'Verify token; load this Shop session and link'],[4,3,'Session + link/KOL eligibility',true],
  [3,4,'If no Shop cookie tracking: read valid fingerprint clicks (24h)'],[4,3,'Candidate KOL, ambiguous result, or no match',true],[3,3,'Choose Coupon > Cookie > Fingerprint > Organic'],
  [3,4,'Save Order attribution + snapshot in order transaction'],[4,3,'Commit created order',true],[3,2,'Order result',true],[2,1,'Order confirmation',true],[1,0,'Show success',true]
 ],'Cookie tracking uses independent Store + visitor sessions. Last processed eligible click wins within a Shop. Fingerprint fallback queries at most 20 clicks and requires one unambiguous KOL. Snapshot records method, IDs, timestamps, confidence and override reason.']
 ]}
};
function build(which){const spec=definitions[which];if(!spec)throw Error('Unsupported diagram '+which);const custom={FR12:'./fr12-single-page-sequence.cjs',FR13:'./fr13-single-page-sequence.cjs'};const pages=custom[which]?[require(custom[which])()]:spec.pages.map(args=>draw(...args));D.save(path.join(__dirname,spec.file),pages);}
module.exports={build};
if(require.main===module){for(const which of process.argv.slice(2).length?process.argv.slice(2):Object.keys(definitions))build(which);console.log('Rebuilt sequence diagrams in the supplied reference style.');}
