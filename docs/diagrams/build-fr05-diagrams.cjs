const fs = require('fs');
const path = require('path');
const D = require('./drawio-monochrome.cjs');
const base = 'FR05_KOL_Monthly_Tiering';

function classDiagram() {
 const d = new D(), w = 3020;
 d.text('FR-05 | KOL Monthly Tiering Engine - Class Diagram',35,20,w-70,45,'fontSize=29;fontStyle=1;');
 d.text('Current code: previous-month Vietnam net goods revenue; scheduled or manual evaluation persists the assigned tier. Selected fields and methods.',35,78,w-70,38,'fontSize=18;');
 const ui=d.cls('<<React function>> KolTierStatusPage',[
  'view: tiers | leaderboard | bonus','tierStatus: TierStatus | null; tierPolicies: TierPolicy[]','loading; statusError; policyError; loadRevision'
 ],['useEffect([view, loadRevision])','loadData(): Promise.allSettled(status, policies, podium)','retry(); samePolicy(left, right)'],35,170,535);
 const web=d.cls('<<web object>> tierService',[],[
  'getAllTiers(): Promise<TierPolicy[]>','getMyTierStatus(): Promise<TierStatus>','triggerEvaluation(): Promise<any>','Uses shared Axios api + client GET cache'
 ],725,170,500);
 const ctl=d.cls('<<NestJS controller>> TiersController',['- tiersService: TiersService'],[
  'getAllTiers()       GET /api/tiers','getMyTierStatus(userId)  GET /my-status','evaluateTiers()     POST /evaluate'
 ],1410,170,600);
 const cron=d.cls('<<framework>> NestJS Scheduler',[
  'ScheduleModule.forRoot() in AppModule',"cron: 15 0 1 * *; Asia/Ho_Chi_Minh"
 ],['Calls TiersService.evaluateAllCollaborators()','00:15 on the first day of each month'],2260,170,680);
 const dto=d.cls('<<web interfaces>> TierPolicy / TierStatus',[
  'TierPolicy: id, name, minRevenueThreshold','extraBonusPercentage: number [TierPolicy]','currentTier / qualifiedTier: TierPolicy','nextTier: TierPolicy | null','currentRevenue; totalOrders; progressPercentage','revenueNeeded: number','revenueBasis: LIFETIME [stale web declaration]'
 ],[],35,665,535);
 const db=d.cls('<<infrastructure>> PrismaService',[],[
  'collaboratorTier.findMany(...)','collaboratorProfile.findUnique / findMany(...)','collaboratorProfile.update({ tierId })','order.findMany({ take: 500, cursor, ... })'
 ],725,720,500);
 const svc=d.cls('<<NestJS service>> TiersService',['- prisma: PrismaService'],[
  'getAllTiers()','getMyTierStatus(userId)','evaluateAllCollaborators()  [@Cron]','- previousMonthWindow(now?): { gte, lt }','- previousMonthSales(userId): { revenue, orderCount }','- tierBonus(tier): number','- policyKey(tier): string'
 ],1410,665,600);
 const helpers=d.cls('<<functions>> Revenue and bonus helpers',[],[
  'tierBonusByName(name): 0 | 1 | 2 | 3','goodsDiscount(order): number','couponDiscountAmount ?? discountAmount ?? 0','Both helpers clamp/normalize their own inputs'
 ],2260,665,680);
 d.edge(ui,web,[570,290],[725,290],['uses',585,257,125]);
 d.edge(web,ctl,[1225,290],[1410,290],['HTTP API',1245,257,140]);
 d.edge(ctl,svc,[1710,ctl.y+ctl.h],[1710,665],['delegates',1730,520,160]);
 d.edge(cron,svc,[2260,300],[2010,720],['scheduled call',2035,470,190],[[2135,300],[2135,720]]);
 d.edge(svc,db,[1410,835],[1225,835],['queries / updates',1235,800,165]);
 d.edge(svc,helpers,[2010,800],[2260,800],['calculates',2040,765,170]);
 d.edge(ui,dto,[300,ui.y+ui.h],[300,665],['state types',320,550,150]);
 d.text('AUTHORIZATION: catalog is public; my-status requires JwtAuthGuard; evaluate requires JWT + RolesGuard and SYSTEM_ADMIN or SHOP_MANAGER.',35,1080,w-70,40,'fontSize=18;');
 d.text('DOMAIN MODEL | solid associations are Prisma relations; Order is attributed to User, not directly to CollaboratorProfile.',35,1150,w-70,42,'fontSize=24;fontStyle=1;');
 const user=d.cls('User',['id: UUID [PK]','role: UserRole'],[],35,1260,535);
 const profile=d.cls('CollaboratorProfile',[
  'id: UUID [PK]; userId: UUID [unique FK]','tierId?: UUID [FK -> CollaboratorTier]','totalEarnedCommission: Decimal [not revenue input]','totalOrdersReferred: int [not queried for tiering]'
 ],[],725,1260,500);
 const tier=d.cls('CollaboratorTier',[
  'id: UUID [PK]; name: string','minRevenueThreshold: Decimal(15,2)','extraBonusPercentage: Decimal(5,2) [stored]','createdAt: DateTime','Effective response bonus is derived from name'
 ],[],1410,1260,600);
 const order=d.cls('Order',[
  'id: UUID [PK]; attributedCollaboratorId?: UUID [FK]','status: OrderStatus; createdAt: DateTime','subtotalAmount / discountAmount: Decimal','couponDiscountAmount?: Decimal','finalAmount / refundedAmount: Decimal','deliveredAt / completedAt?: DateTime [not window]'
 ],[],2260,1260,680);
 d.edge(user,profile,[570,1340],[725,1340],['1              0..1',575,1305,145],[],false);
 d.edge(profile,tier,[1225,1340],[1410,1340],['0..*          0..1',1235,1305,165],[],false);
 d.edge(user,order,[300,user.y+user.h],[2600,order.y+order.h],null,[[300,1640],[2600,1640]],false);
 d.text('0..1 attributed KOL per Order',335,1604,430,26,'fontSize=16;');
 d.text('0..* attributed orders per User',2130,1604,430,26,'fontSize=16;');
 d.text('Revenue = sum(max(0, subtotal - goodsDiscount) * (paid - refund) / paid); paid=max(0, finalAmount); refund is clamped to [0, paid]; paid=0 contributes 0.',35,1710,w-70,44,'fontSize=18;');
 d.text('Filter: attributedCollaboratorId=userId; status DELIVERED or COMPLETED; createdAt within the previous Vietnam calendar month. Count only orders with positive net revenue.',35,1770,w-70,44,'fontSize=18;');
 d.text('Policy catalog sorts threshold / createdAt / id, normalizes bonuses and removes equivalent policies. Evaluation selects the highest qualifying threshold; fallback is the lowest policy.',35,1830,w-70,44,'fontSize=18;');
 d.text('Seed reference only: Bronze 0 VND / +0%; Silver 5m / +1%; Gold 20m / +2%; Diamond 50m / +3%. Actual thresholds come from the database.',35,1890,w-70,44,'fontSize=18;');
 d.text('GET status never writes tierId. It returns PREVIOUS_MONTH_VIETNAM despite the stale frontend LIFETIME type. Cron may promote or demote; no batch transaction, tier history or notification is implemented here.',35,1950,w-70,52,'fontSize=18;');
 return d.page('FR-05 | KOL Monthly Tiering - Classes',w,2040);
}

function sequenceDiagram() {
 const d=new D(), xs=[80,440,960,1490,2050,2670,3240],w=3510;
 const m=[
  [6,4,'Monthly 00:15 Vietnam: evaluateAllCollaborators()'],
  [4,4,'getAllTiers(): load ordered policies'],
  [4,5,'collaboratorTier.findMany(threshold, createdAt, id ASC)'],
  [5,4,'Tier policy records',true],
  [4,4,'Normalize name-based bonus; deduplicate; reverse tiers'],
  [4,5,'collaboratorProfile.findMany(include tier)'],
  [5,4,'All profiles with currently assigned tier',true],
  [4,4,'For each profile: previousMonthSales(userId)'],
  [4,5,'Read attributed DELIVERED / COMPLETED orders; take 500'],
  [5,4,'Order page: amounts + refunds; id ASC',true],
  [4,4,'Sum net goods after refund; repeat cursor pages if 500'],
  [4,4,'Highest qualifying tier; lowest fallback; compare policyKey'],
  [4,5,'Only missing / changed policy: update profile.tierId'],
  [5,4,'If updated: assigned tier persisted',true],
  [4,4,'Repeat remaining profiles; collect changed-tier details'],
  [4,6,'Resolve { message, updatedCount, details }',true],
  [0,1,'Open /collaborator/tiers (independent web flow)'],
  [1,1,'loadData(): status, policies, podium via allSettled'],
  [1,2,'getMyTierStatus()'],
  [2,3,'Cache miss: GET /api/tiers/my-status + JWT'],
  [3,4,'getMyTierStatus(user.id)'],
  [4,5,'collaboratorProfile.findUnique(userId, include tier)'],
  [5,4,'Profile and assigned tier / missing profile',true],
  [4,5,'getAllTiers(): read ordered policy catalog'],
  [5,4,'Policies to normalize and deduplicate',true],
  [4,5,'previousMonthSales: filtered orders, cursor pages of 500'],
  [5,4,'Amounts from previous-month createdAt window',true],
  [4,4,'Compute net revenue, positive order count, qualified tier'],
  [4,4,'currentTier=assigned or lowest; next=threshold above it'],
  [4,4,'Clamp progress 0..100; compute revenueNeeded; no write'],
  [4,3,'TierStatus: basis PREVIOUS_MONTH_VIETNAM',true],
  [3,2,'200 OK: status payload',true],
  [2,1,'res.data -> TierStatus',true],
  [1,2,'Concurrent sibling request: getAllTiers()'],
  [2,3,'Cache miss: GET /api/tiers (public catalog)'],
  [3,4,'getAllTiers()'],
  [4,5,'collaboratorTier.findMany(ordered policies)'],
  [5,4,'Policy records',true],
  [4,3,'Normalized, deduplicated catalog',true],
  [3,2,'200 OK: policy payload',true],
  [2,1,'res.data -> TierPolicy[]',true],
  [1,1,'Unless cancelled: apply settled results; loading=false'],
  [1,0,'Show assigned tier, benefits, progress and policy cards',true]
 ];
 const first=215,step=64,last=first+(m.length-1)*step;
 d.text('FR-05 | Monthly Tier Evaluation and KOL Tier Status - Sequence Diagram',25,14,w-50,44,'fontSize=29;fontStyle=1;');
 d.text('One page. Scheduled evaluation and web reading are independent flows. Repetition and conditions appear on messages; no horizontal fragment frames.',25,67,w-50,37,'fontSize=17;');
 xs.forEach(x=>d.line([x,165],[x,last+45],'endArrow=none;dashed=1;'));
 d.box('KOL',64,110,32,40,'shape=umlActor;fillColor=#FFFFFF;strokeColor=#000000;verticalLabelPosition=bottom;verticalAlign=top;fontSize=16;');
 ['KolTierStatusPage','tierService / shared api (web)','TiersController','TiersService','Prisma / PostgreSQL','NestJS Scheduler'].forEach((n,i)=>d.box(n,xs[i+1]-230,110,460,55,'fillColor=#FFFFFF;strokeColor=#000000;align=center;whiteSpace=wrap;fontStyle=1;fontSize=18;'));
 d.box('',xs[1]-5,first+16*step,10,(42-16)*step+20,'fillColor=#FFFFFF;strokeColor=#000000;');
 for(const [s,e] of [[0,15],[16,32],[33,40]])for(let l=2;l<xs.length;l++){
  const inc=m.map((v,i)=>i>=s&&i<=e&&v[1]===l&&!v[3]?i:-1).filter(i=>i>=0);if(!inc.length)continue;
  const out=m.map((v,i)=>i>=inc[0]&&i<=e&&v[0]===l?i:-1).filter(i=>i>=0);
  d.box('',xs[l]-5,first+inc[0]*step,10,(Math.max(...inc,...out)-inc[0])*step+20,'fillColor=#FFFFFF;strokeColor=#000000;');
 }
 d.box('',xs[6]-5,first,10,15*step+20,'fillColor=#FFFFFF;strokeColor=#000000;');
 m.forEach(([a,b,label,ret],i)=>{const y=first+i*step;if(a===b){d.line([xs[a]+5,y],[xs[a]+5,y+18],'endArrow=block;endFill=1;',[[xs[a]+48,y],[xs[a]+48,y+18]]);d.text(`${i+1}. ${label}`,xs[a]+60,y-29,455,49,'fontSize=16;');}else{d.line([xs[a]+(a?5:0),y],[xs[b]+(b?(b>a?-5:5):0),y],`endArrow=${ret?'open':'block'};endFill=${ret?0:1};${ret?'dashed=1;':''}`);d.text(`${i+1}. ${label}`,Math.min(xs[a],xs[b])+12,y-44,Math.abs(xs[a]-xs[b])-24,41,'fontSize=16;align=center;');}});
 d.text('Cron: 15 0 1 * * in Asia/Ho_Chi_Minh. Window uses Order.createdAt in the previous Vietnam month, not deliveredAt/completedAt. Orders must currently be DELIVERED or COMPLETED and attributed to that KOL.',25,last+65,w-50,48,'fontSize=17;');
 d.text('Revenue excludes goods vouchers and proportionally allocates refunds; paid=0 contributes zero. Page size 500; profiles are processed sequentially. Equivalent policy IDs do not trigger reassignment. Promotion and demotion are both possible.',25,last+120,w-50,48,'fontSize=17;');
 d.text('Manual alternative: POST /api/tiers/evaluate -> TiersController.evaluateTiers() -> same global engine; JWT + SYSTEM_ADMIN or SHOP_MANAGER. No trigger button is wired in KolTierStatusPage. There is no batch transaction or persisted evaluation history.',25,last+175,w-50,48,'fontSize=17;');
 d.text('Web sibling requests run concurrently, drawn separately for readability. Shared client cache can satisfy GET without backend calls. Podium is a separate this_month leaderboard request; its backend flow is outside tier evaluation.',25,last+230,w-50,48,'fontSize=17;');
 d.text('Missing profile/policies: 404; unauthorized status: 401. allSettled keeps separate panel errors and Retry. API basis is PREVIOUS_MONTH_VIETNAM; frontend still declares LIFETIME. Reading status never grants or writes a tier.',25,last+285,w-50,48,'fontSize=17;');
 return d.page('FR-05 | Monthly Tiering and Status - Sequence',w,last+360,1);
}

// Write the class artifact before the sequence artifact, then extract paste-ready models.
D.save(path.join(__dirname,`${base}_Class_Diagram.drawio`),[classDiagram()]);
D.save(path.join(__dirname,`${base}_Sequence_Diagram.drawio`),[sequenceDiagram()]);
for(const kind of ['Class','Sequence']) {
 const xml=fs.readFileSync(path.join(__dirname,`${base}_${kind}_Diagram.drawio`),'utf8');
 fs.writeFileSync(path.join(__dirname,`FR05_${kind}_Paste.xml`),xml.match(/<mxGraphModel\b[\s\S]*?<\/mxGraphModel>/)[0]);
}
console.log('FR05 class, sequence and paste XML files generated.');
