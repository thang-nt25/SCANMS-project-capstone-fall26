const path=require('path');
const D=require('./drawio-monochrome.cjs');
function classDiagram(){
 const d=new D();
 d.text('FR-14 | Redis Click Spam Protection - Class Diagram',35,20,2800,48,'fontSize=29;fontStyle=1;');
 d.text('Current implementation: atomic Redis Lua sliding windows, 10 clicks/second + 60/minute by IP hash, bounded RAM fallback and invalid-click logging.',35,80,2800,40,'fontSize=18;');
 const ui=d.cls('<<React function>> RedirectHandlerPage',['shortCode: route parameter','search: window.location.search'],['useEffect([shortCode])','window.location.replace(backend /r/:code)'],35,165,460);
 const ctrl=d.cls('<<controller>> RedirectController',['- service: ReferralLinksService','- configService: ConfigService'],['handleRedirect(shortCode, req, res, ua, referer)','- isAllowedDestination(destination, appUrl)','- getJwtSecret()'],650,165,500);
 const svc=d.cls('<<service>> ReferralLinksService',['- cacheService: CacheService','- configService: ConfigService','- prisma: PrismaService','- clickQueue?: ClickQueueService'],['handleRedirect(shortCode, clientInfo)','getRateLimitHealth()','getRateLimitDashboard()','getLinkAnalytics(linkId, collaboratorId, ...)'],1300,165,550);
 const cache=d.cls('<<service>> CacheService',['- redisClient: Redis | null','- fallbackSlidingWindowMap: Map<ipHash,','  {timestamps: number[]; lastSeen: number}>','- MAX_FALLBACK_RATELIMIT_ENTRIES = 10000','- clickRateLimitLuaScript: string','- clickRateLimitMetrics: inline object','- blockedIpsSet: Set<string>','- spikeByLink / Store / Collaborator: Map','- degradedSince: Date | null'],['checkClickRateLimitAtomic(params): Promise<result>','recordClickSpike(metadata): void','getHealthStatus(); isRedisActive()','getRedisClient(); get<T>(); set(...)','- recordBlockedIp(ipHash)','- cleanupExpiredRateLimits()','- syncMultiInstanceMetricsFromRedis()'],2010,165,790);
 const ip=d.cls('<<functions>> client-ip.util.ts',[],['extractTrustedClientIp(req, trustProxy, proxies)','isTrustedProxySocket(socketIp, proxies)','cleanIpString(ip): string','normalizeClientIp(ip): string','hashIpForRateLimit(normalizedIp, secret): string'],35,710,460);
 const cfg=d.cls('<<infrastructure>> ConfigService',['CLICK_RATE_LIMIT_SEC = 10 (default)','CLICK_RATE_LIMIT_MIN = 60 (default)','CLICK_RATE_LIMIT_TIMEOUT_MS = 50 in caller','JWT_SECRET; TRUST_PROXY; TRUSTED_PROXIES','REDIS_URL / HOST / PORT / TLS'],['get<T>(key): T'],650,710,500);
 const queue=d.cls('<<service>> ClickQueueService',['- prisma: PrismaService','- cacheService: CacheService'],['enqueue(job): void','processQueue()','- processSingleJob(job): Promise<void>'],1300,790,550);
 const redis=d.cls('<<external library>> ioredis.Redis',['rl:v1:click:sec:{ipHash}: ZSET','rl:v1:click:min:{ipHash}: ZSET','score: timestamp; member: timestamp + UUID','rolling windows: 1000ms / 60000ms','key TTL: 3s / 70s'],['eval(lua, 2, secKey, minKey, ...args)','Lua: ZREMRANGEBYSCORE; ZCARD','If allowed: ZADD; EXPIRE','pipeline(): blocked-IP and spike metrics'],2010,1010,790);
 const params=d.cls('<<inline parameter type>> Rate-limit options',['ipHash: string','secLimit?: number = 10','minLimit?: number = 60','timeoutMs?: number = 20 (method default)'],[],35,1160,460);
 const result=d.cls('<<inline return type>> Rate-limit result',['allowed: boolean','limitedBy: SEC | MIN | null','currentSec / currentMin: number','remainingSec / remainingMin: number','resetTimeSec / resetTimeMin: number','isDegraded: boolean'],[],650,1160,500);
 const prisma=d.cls('<<infrastructure>> PrismaService',['referralLink / clickTrafficLog','attributionSession'],['$transaction(callback)'],1300,1240,550);
 const link=d.cls('<<Prisma model>> ReferralLink',['id: UUID [PK]','shortCode: string [unique]','storeId / collaboratorId / productId: UUID','totalClicks / uniqueClicks: int','lastAccessedAt?: DateTime'],[],1300,1630,550);
 const log=d.cls('<<Prisma model>> ClickTrafficLog',['id: UUID [PK]; eventId?: string [unique]','referralLinkId: UUID [FK]','ipAddress: string [subnet]; ipHash?: string','isValid / isUnique: boolean','riskReason?: string [CLICK_RATE_LIMITED]','receivedAt / createdAt: DateTime'],[],2010,1630,790);
 const admin=d.cls('<<controller>> ReferralLinksController',['- service: ReferralLinksService'],['getRateLimitDashboard()','SYSTEM_ADMIN / SYSTEM_MANAGER only'],35,1630,1115);
 const edge=(a,b,p,q,label,pts=[])=>d.edge(a,b,p,q,label,pts);
 edge(ui,ctrl,[495,270],[650,270],['navigate GET',500,237,145]);
 edge(ctrl,svc,[1150,280],[1300,280],['delegates',1155,247,140]);
 edge(svc,cache,[1850,315],[2010,315],['rate-limit check',1855,282,150]);
 edge(ctrl,ip,[650,355],[495,810],['trusted IP',505,610,140],[[570,355],[570,810]]);
 edge(svc,ip,[1300,440],[495,900],['normalize + HMAC',710,562,230],[[1220,440],[1220,600],[535,600],[535,900]]);
 edge(ctrl,cfg,[900,ctrl.y+ctrl.h],[900,710],['configuration',915,610,180]);
 edge(svc,queue,[1575,svc.y+svc.h],[1575,790],['enqueue valid / invalid job',1585,665,240]);
 edge(cache,redis,[2405,cache.y+cache.h],[2405,1010],['atomic Lua / metrics',2420,890,240]);
 edge(queue,prisma,[1575,queue.y+queue.h],[1575,1240],['log + counters transaction',1590,1145,240]);
 edge(prisma,link,[1575,prisma.y+prisma.h],[1575,1630],['updates raw / unique counts',1590,1530,250]);
 edge(prisma,log,[1850,1340],[2010,1740],['persists log',1860,1515,140],[[1930,1340],[1930,1740]]);
 edge(admin,svc,[1150,1730],[1300,400],['health / dashboard',1155,1530,140],[[1190,1730],[1190,640],[1260,640],[1260,400]]);
 d.edge(link,log,[1850,1810],[2010,1810],null,[],false);
 d.text('1',1860,1778,40,24,'fontSize=16;');d.text('0..*',1950,1778,55,24,'fontSize=16;align=right;');
 d.text('Options and result are anonymous structural TypeScript types, labelled here for readability; they are not declared DTO classes. Redis ZSETs and RAM entries are not Prisma models.',35,1990,2765,48,'fontSize=18;');
 d.text('Rate-limited traffic: still redirect to an allowed destination, skip new AttributionSession/cookies, enqueue isValid=false and CLICK_RATE_LIMITED. Worker still increments totalClicks; uniqueClicks does not increase for invalid jobs.',35,2050,2765,60,'fontSize=18;');
 d.text('IPv4 uses the full address; IPv6 is grouped by /64 before HMAC. Redis enforces shared limits across instances; RAM fallback only enforces limits within one process. No dedicated FR-14 frontend page was found.',35,2130,2765,55,'fontSize=18;');
 return d.page('FR-14 | Redis Click Rate Limit - Classes',2850,2240,0);
}
function sequenceDiagram(){
 const d=new D(),xs=[80,400,860,1320,1800,2240,2700],w=2920;
 const msgs=[
 [0,1,'GET /r/:shortCode (LINK or QR)'],
 [1,1,'Extract IP using trusted proxy rules'],
 [1,2,'handleRedirect(code, clientInfo)'],
 [2,2,'Normalize IP; HMAC with server secret'],
 [2,3,'checkClickRateLimitAtomic(hash, 10, 60, timeout=50ms)'],
 [3,4,'If Redis active: EVAL Lua for sec/min ZSETs'],
 [4,4,'Remove old timestamps; count 1s / 60s'],
 [4,4,'Below limits: add UUID member; TTL 3s / 70s'],
 [4,3,'allowed or SEC/MIN; counts and TTLs',true],
 [3,3,'If unavailable/error/timeout: bounded RAM windows'],
 [3,3,'Update allowed/blocked/degraded metrics'],
 [3,2,'allowed, limitedBy, counts, isDegraded',true],
 [2,3,'Read cached referral link'],
 [3,2,'Cached link / miss',true],
 [2,6,'If cache miss: load link + Store/Product/KOL'],
 [6,2,'Link data',true],
 [2,3,'recordClickSpike(link, Store, KOL, isBlocked)'],
 [2,2,'If denied: no attribution; CLICK_RATE_LIMITED'],
 [2,6,'Only if allowed + eligible: upsert AttributionSession'],
 [6,2,'If upsert attempted: session / failure',true],
 [2,5,'enqueue(isValid, riskReason, eventId, hashes)',false,true],
 [2,1,'Destination + allowAttribution + session result',true],
 [1,0,'302 to safe destination; cookie only if eligible',true],
 [5,5,'Worker: processQueue() asynchronously'],
 [5,6,'Idempotency check; transaction: log + totalClicks'],
 [6,5,'Commit; invalid job has isUnique=false',true],
 [5,4,'If Redis queue: ACK job after successful commit']
 ];
 const first=215,step=63,last=first+(msgs.length-1)*step;
 d.text('FR-14 | Anti Click Spam via Redis Rate Limit - Sequence Diagram',25,14,w-50,44,'fontSize=29;fontStyle=1;');
 d.text('Single request: Redis path or RAM fallback. Conditional arrows show alternatives; guarded steps do not all execute for the same request.',25,67,w-50,35,'fontSize=17;');
 xs.forEach(x=>d.line([x,165],[x,last+45],'endArrow=none;dashed=1;'));
 d.box('Visitor / Browser',64,110,32,40,'shape=umlActor;fillColor=#FFFFFF;strokeColor=#000000;verticalLabelPosition=bottom;verticalAlign=top;fontSize=16;');
 ['RedirectController','ReferralLinksService','CacheService','Redis / Lua ZSET','ClickQueueService','Prisma / PostgreSQL'].forEach((n,i)=>d.box(n,xs[i+1]-190,110,380,55,'fillColor=#FFFFFF;strokeColor=#000000;align=center;whiteSpace=wrap;fontStyle=1;fontSize=18;'));
 for(const [start,end] of [[0,22],[23,26]])for(let lane=1;lane<xs.length;lane++){
  const inc=msgs.map((m,i)=>i>=start&&i<=end&&m[1]===lane&&!m[3]&&!m[4]?i:-1).filter(i=>i>=0);
  if(!inc.length)continue;
  const out=msgs.map((m,i)=>i>=inc[0]&&i<=end&&m[0]===lane?i:-1).filter(i=>i>=0);
  d.box('',xs[lane]-5,first+inc[0]*step,10,(Math.max(...inc,...out)-inc[0])*step+20,'fillColor=#FFFFFF;strokeColor=#000000;');
 }
 msgs.forEach(([a,b,label,ret,async],i)=>{
  const y=first+i*step;
  if(a===b){d.line([xs[a]+5,y],[xs[a]+5,y+18],'endArrow=block;endFill=1;',[[xs[a]+48,y],[xs[a]+48,y+18]]);d.text(`${i+1}. ${label}`,xs[a]+60,y-28,370,48,'fontSize=16;');}
  else {d.line([xs[a]+(a?5:0),y],[xs[b]+(b?(b>a?-5:5):0),y],`endArrow=${ret||async?'open':'block'};endFill=${ret||async?0:1};${ret?'dashed=1;':''}`);d.text(`${i+1}. ${label}`,Math.min(xs[a],xs[b])+12,y-45,Math.abs(xs[a]-xs[b])-24,42,'fontSize=16;align=center;');}
 });
 d.text('Defaults: 10 accepted clicks in a rolling second and 60 in a rolling minute per IP hash, shared across links and Stores. At limit: reject attribution; rejected requests are not inserted into the windows.',25,last+65,w-50,48,'fontSize=17;');
 d.text('Rate-limit denial alone does not return HTTP 429 and does not clear an existing cookie. Link missing/deleted: 404; BLOCKED link: 410. Other bot/privacy/eligibility checks still apply. Frontend RedirectHandlerPage forwards the URL to the backend.',25,last+120,w-50,48,'fontSize=17;');
 d.text('Redis error/timeout falls back to a local timestamp Map (maximum 10,000 IP entries); distributed enforcement is degraded. Worker runs independently; logging invalid traffic increments totalClicks but not uniqueClicks.',25,last+175,w-50,48,'fontSize=17;');
 return d.page('FR-14 | Redis Click Rate Limit - Sequence',w,last+245,1);
}
D.save(path.join(__dirname,'FR14_Redis_Click_Rate_Limit_Class_Diagram.drawio'),[classDiagram()]);
console.log('Created FR-14 class diagram.');
D.save(path.join(__dirname,'FR14_Redis_Click_Rate_Limit_Sequence_Diagram.drawio'),[sequenceDiagram()]);
console.log('Created FR-14 single-page sequence diagram.');
