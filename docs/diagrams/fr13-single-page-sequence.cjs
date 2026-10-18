const D = require('./drawio-monochrome.cjs');

module.exports = function drawFr13Overview() {
 const d = new D(), xs = [80,400,820,1260,1700,2140,2600], width=2820;
 const messages = [
  [0,1,'Open referral link / QR'],
  [1,2,'Navigate GET /r/:shortCode'],
  [2,2,'Read cookie, IP, UA and consent'],
  [2,3,'handleRedirect(code, clientInfo)'],
  [3,5,'Check rate limit; read link cache'],
  [5,3,'Cached link or miss',true],
  [3,6,'If cache miss: read link + Store/Product/KOL'],
  [6,3,'Link and eligibility data',true],
  [3,3,'Validate link; hash visitor/IP/UA'],
  [3,6,'If eligible: upsert Store + visitor session'],
  [6,3,'Updated Last-Click session',true],
  [3,4,'enqueue(click job: hashes, validity, LINK/QR)',false,true],
  [3,2,'Destination + session result',true],
  [2,0,'If eligible: Set-Cookie; 302 redirect',true],
  [4,4,'Timer: processQueue() every 1.5s'],
  [4,5,'Lease Redis job (local memory fallback)'],
  [5,4,'Pending job',true],
  [4,6,'Check eventId idempotency'],
  [6,4,'Already processed / new event',true],
  [4,5,'If new + valid: unique key NX EX 1800'],
  [5,4,'Unique / repeated click',true],
  [4,6,'If new: transaction: log click + counters'],
  [6,4,'Commit processed click',true],
  [4,5,'ACK Redis job after commit'],
  [0,1,'Confirm checkout'],
  [1,2,'POST /api/orders + browser cookies'],
  [2,3,'OrdersService.createOrder(dto, context)'],
  [3,3,'Verify token; resolve this Store context'],
  [3,6,'Load session + link/KOL eligibility'],
  [6,3,'Valid session / no eligible session',true],
  [3,6,'If no Store cookie tracking: fingerprint clicks (24h)'],
  [6,3,'One KOL / ambiguous / no match',true],
  [3,3,'Choose Coupon > Cookie > Fingerprint > Organic'],
  [3,6,'Transaction: save Order attribution + snapshot'],
  [6,3,'Commit created order',true],
  [3,2,'Order result',true],
  [2,1,'Order confirmation',true],
  [1,0,'Show success',true]
 ];
 const first=215,step=54,last=first+(messages.length-1)*step;
 d.text('FR-13 | Last-Click Tracking, Visitor Cookie and Order Attribution',25,14,width-50,42,'fontSize=28;fontStyle=1;');
 d.text('Single-page successful flow. Conditional calls are labelled. Queue processing runs asynchronously and may overlap checkout.',25,65,width-50,36,'fontSize=17;');
 xs.forEach(x=>d.line([x,165],[x,last+45],'endArrow=none;dashed=1;'));
 d.box('Visitor / Customer',64,110,32,40,'shape=umlActor;fillColor=#FFFFFF;strokeColor=#000000;verticalLabelPosition=bottom;verticalAlign=top;fontSize=16;');
 ['Redirect Page / Checkout','Redirect / Orders Controllers','ReferralLinksService / OrdersService','ClickQueueService','CacheService / Redis','Prisma / PostgreSQL'].forEach((name,i)=>d.box(name,xs[i+1]-185,110,370,55,'fillColor=#FFFFFF;strokeColor=#000000;align=center;whiteSpace=wrap;fontStyle=1;fontSize=17;'));
 // Distinct activations for redirect, asynchronous worker and checkout.
 for(const [start,end] of [[0,13],[14,23],[24,37]]){
  for(let lane=1;lane<xs.length;lane++){
   const incoming=messages.map((m,i)=>i>=start&&i<=end&&m[1]===lane&&!m[3]&&!m[4]?i:-1).filter(i=>i>=0);
   if(!incoming.length)continue;
   const outgoing=messages.map((m,i)=>i>=incoming[0]&&i<=end&&m[0]===lane?i:-1).filter(i=>i>=0);
   const bottom=Math.max(...incoming,...outgoing);
   d.box('',xs[lane]-5,first+incoming[0]*step,10,(bottom-incoming[0])*step+18,'fillColor=#FFFFFF;strokeColor=#000000;');
  }
 }
 messages.forEach(([a,b,label,ret,async],i)=>{
  const y=first+i*step;
  if(a===b){
   d.line([xs[a]+5,y],[xs[a]+5,y+18],'endArrow=block;endFill=1;',[[xs[a]+48,y],[xs[a]+48,y+18]]);
   d.text(`${i+1}. ${label}`,xs[a]+60,y-25,360,45,'fontSize=15;');
  }else{
   d.line([xs[a]+(a?5:0),y],[xs[b]+(b?(b>a?-5:5):0),y],`endArrow=${ret||async?'open':'block'};endFill=${ret||async?0:1};${ret?'dashed=1;':''}`);
   d.text(`${i+1}. ${label}`,Math.min(xs[a],xs[b])+12,y-41,Math.abs(xs[a]-xs[b])-24,38,'align=center;fontSize=15;');
  }
 });
 d.text('UI: RedirectHandlerPage, GuestCheckoutModal. Controllers: RedirectController, OrdersController. Service lifeline groups ReferralLinksService (redirect) and OrdersService (checkout).',25,last+65,width-50,42,'fontSize=16;');
 d.text('Cookie stores a signed visitor ID; the winning link/KOL stays in an independent session per Store. Default expiry: 30 days, configurable 1-365. A new eligible click refreshes that Store session. Invalid/opt-out traffic sets no new attribution.',25,last+111,width-50,48,'fontSize=16;');
 d.text('Queue dedup is separate from Last-Click. Existing eventId is skipped; without Redis, DB advisory locks provide unique-click fallback. Fingerprint attribution requires an unambiguous KOL. The order saves the attribution snapshot.',25,last+163,width-50,48,'fontSize=16;');
 return d.page('FR-13 | Last-Click and Cookie Lifecycle',width,last+235,1);
};
