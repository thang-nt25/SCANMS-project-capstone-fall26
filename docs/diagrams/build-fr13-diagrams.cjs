const path=require('path');
const D=require('./drawio-monochrome.cjs');
const d=new D();
d.text('FR-13 | Last-Click Tracking and Cookie Engine - Class Diagram',35,20,2800,45,'fontSize=29;fontStyle=1;');
d.text('Current implementation: server-side fingerprint, per-Store attribution session, signed visitor cookie, asynchronous click log and order attribution.',35,75,2800,32,'fontSize=18;');
const web=d.cls('<<React function>> RedirectHandlerPage',['shortCode: route parameter','search: window.location.search'],['useEffect([shortCode])','window.location.replace(backend /r/:code)'],35,150,470);
const rc=d.cls('<<NestJS controller>> RedirectController',['- service: ReferralLinksService','- configService: ConfigService'],['handleRedirect(shortCode, req, res, ua, referer)','updateConsent(body, res)','- isAllowedDestination(destination, appUrl)','- getPublicAppUrl(); - getJwtSecret()','- detectDeviceType(ua); - isSocialBot(ua)'],630,150,535);
const service=d.cls('<<NestJS service>> ReferralLinksService',['- prisma: PrismaService','- configService: ConfigService','- cacheService: CacheService','- clickQueue?: ClickQueueService'],['handleRedirect(shortCode, clientInfo)','getLinkAnalytics(linkId, collaboratorId, ...)'],1300,150,525);
const util=d.cls('<<functions>> Tracking helpers',[],['signOpaqueVisitorToken(visitorId, secret)','verifyOpaqueVisitorToken(token, secret)','verifyMultiShopAttributionToken(token, secret)','hashIpAddress(ip, secret): {prefix, hash}','normalizeUserAgent(ua): string','generateDeviceFingerprint(ip, ua, secret)','computeEffectiveStatus(link) [service export]'],1980,150,700);
const ci=d.cls('<<interface>> ClientTrackingInfo',['ip: string; userAgent?: string','referer?; fingerprint?; deviceType?: string','sessionId?: string','accessMethod?: QR | LINK','isOptedOut?: boolean'],[],35,535,470);
const queue=d.cls('<<NestJS service>> ClickQueueService',['- queue: EnqueuedClickJob[]','- inFlightMemQueue: Map','workerId: string; leaseDurationMs = 30000'],['enqueue(job): void','processQueue()','reclaimStuckJobs(): Promise<number>','- processSingleJob(job): Promise<void>'],1300,595,525);
const cache=d.cls('<<NestJS service>> CacheService',['- redisClient: Redis | null','- memoryCache: Map'],['checkClickRateLimitAtomic(options)','recordClickSpike(options)','get<T>(key); set(key, value, ttlSeconds)','getRedisClient()'],1980,600,700);
const checkout=d.cls('<<React component>> GuestCheckoutModal',[],['handleSubmitOrder(event)','POST /api/orders; browser sends cookies'],35,1010,470);
const oc=d.cls('<<NestJS controller>> OrdersController',['- ordersService: OrdersService'],['createOrder(dto, req, userId)'],630,1010,535);
const os=d.cls('<<NestJS service>> OrdersService',['- prisma: PrismaService','- couponsService: CouponsService'],['createOrder(dto, clientContext)','- executeStoreOrderInTransaction(...)'],1300,1070,525);
const prisma=d.cls('<<infrastructure>> PrismaService',[],['referralLink / attributionSession / clickTrafficLog','order / auditLog / $transaction'],1980,1070,700);
d.edge(web,rc,[505,240],[630,240],['navigate GET',510,208,115]);
d.edge(rc,service,[1165,285],[1300,285],['delegates',1170,253,125]);
d.edge(rc,util,[1165,180],[1980,180],['token helpers',1450,113,250],[[1225,180],[1225,128],[1900,128],[1900,180]]);
d.edge(service,util,[1825,320],[1980,320],['hash / fingerprint',1830,288,145]);
d.edge(service,queue,[1560,service.y+service.h],[1560,595],['enqueue async',1575,515,180]);
d.edge(service,ci,[1300,355],[505,650],['clientInfo type',710,472,190],[[1240,355],[1240,500],[550,500],[550,650]]);
d.edge(service,cache,[1825,380],[1980,700],['rate limit + link cache',1840,520,130],[[1910,380],[1910,700]]);
d.edge(queue,cache,[1825,750],[1980,780],['queue / dedup',1830,810,145],[[1910,750],[1910,780]]);
d.edge(checkout,oc,[505,1090],[630,1090],['POST orders',510,1058,115]);
d.edge(oc,os,[1165,1100],[1300,1150],['delegates',1170,1180,125],[[1230,1100],[1230,1150]]);
d.edge(os,prisma,[1825,1190],[1980,1190],['transaction',1830,1158,145]);
d.edge(queue,prisma,[1825,820],[1980,1110],['log + counters',1835,955,140],[[1930,820],[1930,1110]]);
d.edge(service,prisma,[1825,390],[1980,1140],['session upsert',1835,1000,140],[[1950,390],[1950,1140]]);
d.text('EnqueuedClickJob includes eventId, link/store/KOL/product IDs, subnet/IP hash, normalized UA, fingerprintHash, visitorIdHash, validity/risk and receivedAt.',35,1370,2700,32,'fontSize=17;');
d.text('DOMAIN MODEL - selected fields; plain solid lines are persisted associations',35,1430,2750,40,'fontSize=25;fontStyle=1;');
const user=d.cls('User',['id: UUID [PK]','fullName: string; isActive: boolean'],[],35,1520,420);
const store=d.cls('Store',['id: UUID [PK]','attributionWindowDays: int = 30','deletedAt?: DateTime'],[],35,1810,420);
const link=d.cls('ReferralLink',['id: UUID [PK]; shortCode: string [unique]','storeId / collaboratorId / productId: UUID [FK]','destinationPath: string','status: ReferralLinkStatus','expiresAt / deletedAt: DateTime?','totalClicks / uniqueClicks: int','lastAccessedAt?: DateTime'],[],650,1520,600);
const session=d.cls('AttributionSession',['id: UUID [PK]','storeId / collaboratorId / referralLinkId: UUID [FK]','visitorIdHash / fingerprintHash: string','latestClickId?: UUID [scalar, no FK]','firstClickedAt / lastClickedAt: DateTime','expiresAt: DateTime; status: string = ACTIVE','version: int = 1','unique(storeId, visitorIdHash)'],[],650,1980,600);
const click=d.cls('ClickTrafficLog',['id: UUID [PK]; eventId?: string [unique]','referralLinkId: UUID [FK]','storeId / collaboratorId / productId: UUID? [scalars]','ipAddress: string [subnet]; ipHash?: string','userAgent?: string [normalized]','deviceFingerprint?: string [written null]','fingerprintHash?: string','sessionId?: string [visitor hash]','accessMethod: LINK | QR','isValid / isUnique: boolean','riskReason?; referrer?; UTM fields?','receivedAt / createdAt: DateTime'],[],1450,1520,600);
const order=d.cls('Order',['id: UUID [PK]; storeId: UUID [FK]','attributedCollaboratorId?: UUID [FK -> User]','referralLinkId?: UUID [FK]','couponId?: UUID [FK]','attributionSessionId / clickId: UUID? [scalars]','attributionMethod?: AttributionMethod','attributionConfidence?: string','overrideReason?; originalCollaboratorId?','attributionSnapshot?: Json','attributedAt / clickedAt: DateTime?'],[],2230,1520,600);
d.text('Last-Click rule: upsert the same Store + visitor row with the latest processed valid link/KOL, lastClickedAt and expiry. Other Stores keep independent rows.',1450,2050,1380,65,'fontSize=19;');
d.text('Cookie holds signed visitor ID only; the winning KOL/link lives in AttributionSession. Order stores a snapshot when attribution is resolved.',1450,2150,1380,60,'fontSize=19;');
function assoc(a,b,p,q,l,r,pts=[]){d.edge(a,b,p,q,null,pts,false);d.text(l,p[0]+8,p[1]-31,70,24,'fontSize=15;');d.text(r,q[0]-75,q[1]-31,65,24,'fontSize=15;align=right;');}
assoc(user,link,[455,1620],[650,1620],'1','0..*');
assoc(store,link,[455,1890],[650,1730],'1','0..*',[[540,1890],[540,1730]]);
assoc(link,session,[950,link.y+link.h],[950,1980],'1','0..*');
assoc(store,session,[455,1910],[650,2120],'1','0..*',[[555,1910],[555,2120]]);
assoc(user,session,[245,user.y+user.h],[650,2200],'1','0..*',[[245,1760],[585,1760],[585,2200]]);
assoc(link,click,[1250,1650],[1450,1650],'1','0..*');
assoc(link,order,[1250,1550],[2230,1550],'0..1','0..*',[[1350,1550],[1350,1480],[2145,1480],[2145,1550]]);
d.text('Order.attributedCollaboratorId also references User (0..* orders per user). latestClickId, Order.attributionSessionId and clickId are scalar IDs, not @relation links.',35,2350,2780,32,'fontSize=17;');
d.text('Client IP extraction is in client-ip.util.ts. No browser fingerprint SDK is used by this path; fingerprint is HMAC(subnet + normalized User-Agent).',35,2390,2780,32,'fontSize=17;');
d.text('30 days is the default, not a constant policy. Redirect uses Store attributionWindowDays within 1-365. A new valid click refreshes that Store session expiry.',35,2430,2780,32,'fontSize=17;');
D.save(path.join(__dirname,'FR13_Last_Click_Tracking_Cookie_Class_Diagram.drawio'),[d.page('FR-13 - Tracking Last-Click and Cookie - Classes',2880,2490)]);
const pages=[];
function seq(title,names,actor='Visitor / Browser',width=1700){const s=new D(),count=names.length+1,step=(width-250)/(count-1),xs=Array.from({length:count},(_,i)=>80+i*step),boxWidth=Math.min(260,step*.88);s.text('FR-13 | '+title,25,15,width-50,40,'fontSize=25;fontStyle=1;');for(const x of xs)s.line([x,145],[x,925],'endArrow=none;dashed=1;');s.box(actor,64,82,32,38,'shape=umlActor;fillColor=#FFFFFF;strokeColor=#000000;verticalLabelPosition=bottom;verticalAlign=top;fontSize=13;');names.forEach((name,i)=>s.box(name,xs[i+1]-boxWidth/2,91,boxWidth,54,'fillColor=#FFFFFF;strokeColor=#000000;align=center;fontStyle=1;fontSize=13;whiteSpace=wrap;'));let n=0;return {s,xs,msg(a,b,y,v,ret=false,async=false){s.line([xs[a],y],[xs[b],y],`endArrow=${async?'open':ret?'open':'block'};endFill=${ret||async?0:1};${ret?'dashed=1;':''}`);s.text(`${++n}. ${v}`,Math.min(xs[a],xs[b])+10,y-31,Math.abs(xs[a]-xs[b])-20,28,'fontSize=13;align=center;');},note(v,y,x=365,w=width-410,h=42){s.note(v,x,y,w,h);},bar(a,y,h){s.box('',xs[a]-5,y,10,h,'fillColor=#FFFFFF;strokeColor=#000000;');},end(name,notes){notes.forEach((v,i)=>s.text(v,25,950+34*i,width-50,30,'fontSize=13;'));pages.push(s.page(name,width,1100,1));}};}
{
const q=seq('01 - Track Click, Update Last-Click and Set Cookie',['RedirectController','ReferralLinksService','CacheService','Prisma / PostgreSQL','ClickQueueService']);
q.bar(1,185,675);q.bar(2,285,480);
q.msg(0,1,185,'GET /r/:shortCode');q.note('ref  Frontend RedirectHandlerPage forwards /r/:code and query string to backend. Controller reads trusted IP, UA, cookies and consent signals.',209,390,1255,44);
q.msg(1,2,285,'handleRedirect(code, clientInfo)');q.msg(2,3,330,'IP limits; link cache lookup');q.note('ref  On cache miss read ReferralLink + Product/Store/KOL (cache 300s). Missing/deleted -> 404; BLOCKED -> 410, terminate.',350,695,950,44);
q.note('Check bot, link/product status, rate limit and opt-out. Compute subnet/IP HMAC, normalized UA, fingerprintHash and visitorIdHash.',414,390,1255,42);
q.s.box('',610,480,1035,128,'fillColor=none;strokeColor=#000000;');q.s.text('opt [click eligible for attribution]',620,482,1000,23,'fontSize=13;fontStyle=1;');
q.msg(2,4,540,'Upsert session by (storeId, visitorIdHash)');q.msg(4,2,585,'Updated session; failure disables new attribution',true);
q.msg(2,5,665,'enqueue(click job: hashes, validity, risk, LINK/QR)',false,true);q.msg(2,1,765,'destination + allowAttribution + session result',true);
q.note('opt  Eligible click + successful session: Set-Cookie scanms_attr, scanms_attribution and scanms_vid; HttpOnly; SameSite=Lax; Secure in production.',787,390,1255,43);
q.msg(1,0,860,'302 to allowlisted destination',true);
q.end('01 - Click and cookie',['Default attribution window = 30 days; per-Store configuration supports 1-365. Same Store + visitor row is replaced by the latest processed valid click.','Bot/rate-limited/PAUSED/EXPIRED/opt-out visits create no new attribution cookie; safe redirect continues. Social crawlers receive 200 Open Graph HTML.','Destination allowlist is checked after service work/cookie assignment in current code. Invalid destination returns 400. Click logging is asynchronous.']);
}
{
const q=seq('02 - Persist Click Log and Deduplicate Unique Clicks',['ClickQueueService','CacheService / Redis','Prisma / PostgreSQL'],'Worker Timer');q.bar(1,185,675);
q.msg(0,1,185,'processQueue() every 1.5 seconds');q.note('ref  Lease pending Redis job (30s visibility), or use memory queue. Process up to 50 Redis jobs per pass.',215,510,1135,44);
q.msg(1,3,300,'Check existing eventId (idempotency)');q.msg(3,1,345,'Already saved -> acknowledge; otherwise continue',true);
q.msg(1,2,415,'Valid job: SET dedup key NX EX 1800');q.msg(2,1,460,'Unique / repeated click',true);
q.note('ref  Without Redis client: advisory transaction lock and recent-click query provide DB dedup fallback. Invalid jobs are not unique.',485,510,1135,44);
q.msg(1,3,590,'Transaction: update counters + insert ClickTrafficLog');q.msg(3,1,645,'Commit, or rollback on failure',true);q.msg(1,2,710,'ACK Redis processing job after success');
q.note('On failure: retry up to 3 times, then Redis DLQ. Expired leases are reclaimed every 15 seconds. RAM fallback uses local queue/in-flight state.',745,510,1135,50);
q.msg(1,0,860,'Worker pass finishes',true);
q.end('02 - Click queue and dedup',['Dedup is per link + visitor hash (fallback fingerprint/IP); 30-minute unique-click dedup does not prevent Last-Click session updates on new eligible clicks.','Store subnet /24 (IPv4) or /48 (IPv6), IP hash, normalized UA, fingerprint hash, hashed session ID and validity/risk. Raw deviceFingerprint is null.','ReferralLink.totalClicks counts processed jobs, including invalid traffic; uniqueClicks increases only for unique valid jobs. Counters and log share a DB transaction.']);
}
{
const q=seq('03 - Resolve Attribution When Creating an Order',['GuestCheckoutModal','OrdersController','OrdersService','Prisma / PostgreSQL'],'Customer / Browser');q.bar(1,185,675);q.bar(2,230,585);q.bar(3,275,485);
q.msg(0,1,185,'Confirm checkout');q.msg(1,2,230,'POST /api/orders + browser cookies');q.msg(2,3,275,'createOrder(dto, clientContext)');q.note('Controller reads scanms_attr / legacy aliases, client IP and UA. Server validates cart/coupon and opens order transaction.',300,680,965,44);
q.msg(3,4,395,'Verify visitor token; load this Store session');q.msg(4,3,440,'Session + active link/KOL eligibility',true);
q.s.box('',35,480,1610,135,'fillColor=none;strokeColor=#000000;');q.s.text('opt [no Store cookie tracking and no cookie candidate]',45,482,1550,24,'fontSize=13;fontStyle=1;');
q.msg(3,4,540,'Read valid fingerprint clicks from last 24h');q.msg(4,3,585,'One KOL -> candidate; multiple KOLs -> ambiguous',true);
q.note('Resolve winner: valid Coupon > Cookie session > unambiguous Fingerprint > Organic. Cookie sessions follow per-Store Last-Click.',640,390,1255,44);
q.msg(3,4,725,'Save Order attribution fields + snapshot; commit');q.msg(3,2,770,'Order result',true);q.msg(2,1,815,'Order confirmation',true);q.msg(1,0,860,'Display success',true);
q.end('03 - Order attribution',['A valid coupon overrides click-based attribution. Cookie/session/link expiration and link/KOL status are rechecked at order creation.','Fingerprint query: this Store, isValid=true, last 24h, newest first, at most 20 clicks. Existing invalid/expired Store session suppresses fingerprint fallback.','Order snapshot records method, KOL/link/session/click IDs, timestamps, confidence and override reason. Legacy signed multi-Shop and referral cookies remain supported.']);
}
require('./build-reference-style-sequences.cjs').build('FR13');
console.log('Created FR-13 class diagram and single-page sequence lifecycle.');
