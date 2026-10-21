const fs=require('fs');
const path=require('path');
const D=require('./drawio-monochrome.cjs');
const base='FR06_Store_Settings';

function classes(){
 const d=new D(),w=3230;
 d.text('FR-06 | Store Settings - Class Diagram',35,20,w-70,45,'fontSize=29;fontStyle=1;');
 d.text('Current implementation: editable attribution window; fixed platform base commission 10%; withdrawal minimum belongs to system configuration.',35,78,w-70,38,'fontSize=18;');
 const ui=d.cls('<<React function>> ShopSettingsPage',[
  'name; description; logoUrl; policyReturn/Warranty/Shipping','attributionWindowDays: number = 30','shopOwnerDetails; ownerDetailsDraft; sameReturnAddress','saving; savingOwnerDetails; toastMsg'
 ],['loadStore(); useEffect() [SHOP_MANAGER only]','handleSave(event); handleSaveOwnerDetails()','handleFileUpload(event); showToast(message)'],35,170,630);
 const web=d.cls('<<web object>> storeService',[],[
  'getMyStore(fresh=false): Promise<StoreSettings>','updateMyStore(data: Partial<StoreSettings>)','getPublicStore(slug) [outside settings flow]','Uses shared Axios api and client GET cache'
 ],860,170,560);
 const ctl=d.cls('<<NestJS controller>> StoresController',[
  '- storesService: StoresService','- presence: StorePresenceService [other routes]'
 ],['getMyStore(ownerId): GET /api/stores/my-store','updateMyStore(ownerId, dto): PUT same path'],1620,170,620);
 const dto=d.cls('<<DTO>> UpdateStoreDto',[
  'name?; description?; logoUrl?; websiteUrl?: string','policyReturn/Warranty/Shipping?: string [max 500]','defaultCommissionRate?: number [Min=Max=10]','attributionWindowDays?: number [1..365]','representativeName?; businessType?; taxCode?','contactPhone?; contactEmail?; warehouseAddress?','businessAddress?; returnWarehouseAddress?','payoutBankName/AccountNumber/AccountName?'
 ],[],2480,170,700);
 const types=d.cls('<<web interface>> StoreSettings',[
  'id; name; slug: string','defaultCommissionRate: number','attributionWindowDays: number','description?; logoUrl?; websiteUrl?; policies?','onboardingData?; owner?; _count?','No minPayoutAmount input field'
 ],[],35,730,630);
 const db=d.cls('<<infrastructure>> PrismaService',[],[
  'store.findFirst({ ownerId, isDeleted: false })','store.create(...); store.update(...)','user.findUnique({ id: ownerId })'
 ],860,730,560);
 const svc=d.cls('<<NestJS service>> StoresService',['- prisma: PrismaService'],[
  'getMyStore(ownerId)','updateMyStore(ownerId, dto)','Read: create default Store when missing','Update: verify logo and warehouse address','Trim fields; merge onboardingData JSON','Always persist defaultCommissionRate = 10'
 ],1620,730,620);
 const policy=d.cls('<<NestJS service>> WithdrawalPolicyService',[
  'readonly minimumAmount: Prisma.Decimal','MIN_PAYOUT_AMOUNT or default 200000.00'
 ],['constructor(configService: ConfigService)','Validate positive money, at most 2 decimals'],2480,730,700);
 d.edge(ui,web,[665,300],[860,300],['uses',680,266,160]);
 d.edge(web,ctl,[1420,300],[1620,300],['HTTP + JWT',1430,266,180]);
 d.edge(ctl,dto,[2240,300],[2480,300],['PUT body validation',2250,266,220]);
 d.edge(ui,types,[350,ui.y+ui.h],[350,730],['state type',370,630,180]);
 d.edge(ctl,svc,[1930,ctl.y+ctl.h],[1930,730],['delegates',1950,580,180]);
 d.edge(svc,db,[1620,820],[1420,820],['queries / writes',1430,785,180]);
 d.text('AUTH: GET allows SHOP_MANAGER or SYSTEM_ADMIN; PUT allows SHOP_MANAGER only. ownerId comes from JWT, not the submitted body.',35,1120,w-70,40,'fontSize=18;');
 d.text('DOMAIN MODEL AND RUNTIME CONSUMERS | Solid lines are persisted relations; dashed arrows are dependencies.',35,1190,w-70,42,'fontSize=25;fontStyle=1;');
 const user=d.cls('User',['id: UUID [PK]','fullName; email; phoneNumber?','role: UserRole'],[],35,1290,630);
 const store=d.cls('Store',[
  'id: UUID [PK]; ownerId: UUID [FK -> User]','name; slug [unique]; logoUrl?; description?','defaultCommissionRate: Decimal(5,2) = 10','attributionWindowDays: Int = 30','minPayoutAmount: Decimal(15,2) = 200000','policyReturn?; policyWarranty?; policyShipping?','onboardingData?: Json; returnWarehouse?: Json','isDeleted: boolean; updatedAt: DateTime'
 ],[],860,1290,560);
 const ref=d.cls('<<NestJS service>> ReferralLinksService',[
  '- prisma: PrismaService; - cacheService: CacheService'
 ],['handleRedirect(shortCode, clientInfo)','Use Store attributionWindowDays if 1..365, else 30','Compute expiry; upsert Store + visitor session','ref_link cache TTL = 300 seconds'],1620,1290,620);
 const red=d.cls('<<NestJS controller>> RedirectController',[],[
  'handleRedirect(shortCode, req, res, ...)','Use result.attributionWindowDays for maxAge','Valid session + consent: set signed visitor cookies'
 ],2480,1290,700);
 d.edge(user,store,[665,1370],[860,1370],['1 owner        0..* Stores',670,1335,180],[],false);
 d.edge(ref,store,[1620,1410],[1420,1410],['reads window',1430,1375,180]);
 d.edge(red,ref,[2480,1410],[2240,1410],['calls',2280,1375,150]);
 const payouts=d.cls('<<NestJS service>> PayoutsService',[
  '- policy: WithdrawalPolicyService [other deps omitted]'
 ],['createWithdrawal(collaboratorId, dto)','Reject amount < policy.minimumAmount'],35,1780,630);
 const wallet=d.cls('<<NestJS service>> WalletSummaryService',[
  '- policy: WithdrawalPolicyService [other deps omitted]'
 ],['getMyWallet(collaboratorId)','Returns minimumWithdrawalAmount from policy'],860,1780,560);
 const config=d.cls('<<framework>> ConfigService',[],[
  'get<string>(MIN_PAYOUT_AMOUNT)','Read server configuration at service construction'
 ],2480,1780,700);
 d.edge(policy,config,[2830,policy.y+policy.h],[2830,1780],['reads at startup',2850,1620,200],[[3200,policy.y+policy.h],[3200,1720],[2830,1720]]);
 d.edge(payouts,policy,[665,1870],[2480,900],['minimum amount',1790,1695,200],[[740,1870],[740,1740],[2370,1740],[2370,900]]);
 d.edge(wallet,policy,[1420,1870],[2480,870],['same global policy',1760,1905,260],[[2330,1870],[2330,870]]);
 d.text('Store.minPayoutAmount exists in the schema, but this settings DTO/service does not update it. Current KOL withdrawal validation uses WithdrawalPolicyService instead.',35,2070,w-70,48,'fontSize=18;');
 d.text('UI window choices: 7 / 14 / 30 / 60 days. DTO accepts numeric 1..365 (no IsInt decorator); database column is Int. Commission input is disabled at 10%.',35,2130,w-70,48,'fontSize=18;');
 d.text('Changing settings does not rewrite existing sessions/cookies. Referral-link cache may retain the prior window for up to its 300s TTL; StoresService does not invalidate that cache.',35,2190,w-70,48,'fontSize=18;');
 d.text('Cookie/session runtime is a related FR-13 consumer. CommissionCalculatorService also uses a fixed base 10% for new calculations and preserves existing order snapshots.',35,2250,w-70,48,'fontSize=18;');
 return d.page('FR-06 | Store Settings - Classes',w,2330);
}

function sequence(){
 const d=new D(),xs=[80,450,990,1540,2110,2740],w=3040;
 const m=[
  [0,1,'Open /merchant/settings as SHOP_MANAGER'],
  [1,2,'loadStore() -> getMyStore(fresh=false)'],
  [2,3,'Cache miss: GET /api/stores/my-store + JWT'],
  [3,4,'getMyStore(ownerId from current user)'],
  [4,5,'store.findFirst(ownerId, isDeleted=false; owner + counts)'],
  [5,4,'Existing Store / null',true],
  [4,5,'Only if missing: user.findUnique(ownerId)'],
  [5,4,'User for default Store name',true],
  [4,4,'Only if missing: generate name and slug suffix'],
  [4,5,'Only if missing: store.create(rate=10, window=30)'],
  [5,4,'Created Store + owner + counts',true],
  [4,3,'Existing or newly created Store',true],
  [3,2,'200 OK: Store payload',true],
  [2,1,'Normalize res.data || res -> StoreSettings',true],
  [1,0,'Populate fields; show fixed 10% and selected window',true],
  [0,1,'Choose 7 / 14 / 30 / 60 days; edit Shop details; Save'],
  [1,1,'handleSave: check logo; validate edited owner details'],
  [1,2,'updateMyStore(payload; rate=10; window=Number(value))'],
  [2,3,'PUT /api/stores/my-store + JWT + JSON body'],
  [3,3,'JWT + SHOP_MANAGER guard; global UpdateStoreDto validation'],
  [3,4,'updateMyStore(ownerId, dto)'],
  [4,5,'store.findFirst(ownerId, isDeleted=false)'],
  [5,4,'Owned Store / missing Store',true],
  [4,4,'Require Store; reject blank logo / invalid warehouse'],
  [4,4,'Trim fields; merge onboardingData and optional warehouse'],
  [4,5,'store.update(id): window if sent; always rate=10'],
  [5,4,'Updated Store persisted',true],
  [4,3,'{ message, store: updated }',true],
  [3,2,'200 OK: update result',true],
  [2,2,'Shared api invalidates /stores client cache on success'],
  [2,1,'Resolve update result; page does not refetch Store',true],
  [1,1,'Commit edited owner draft if needed; saving=false'],
  [1,0,'Show saved toast; dismiss after 3 seconds',true]
 ];
 const first=215,step=66,last=first+(m.length-1)*step;
 d.text('FR-06 | Load and Save Store Settings - Sequence Diagram',25,14,w-50,44,'fontSize=29;fontStyle=1;');
 d.text('One page. Main successful flow; create-if-missing calls are conditional. Shared client-cache miss is shown. No horizontal fragment frames.',25,67,w-50,37,'fontSize=17;');
 xs.forEach(x=>d.line([x,165],[x,last+45],'endArrow=none;dashed=1;'));
 d.box('Shop Manager',64,110,32,40,'shape=umlActor;fillColor=#FFFFFF;strokeColor=#000000;verticalLabelPosition=bottom;verticalAlign=top;fontSize=16;');
 ['ShopSettingsPage','storeService / shared api (web)','StoresController','StoresService','Prisma / PostgreSQL'].forEach((n,i)=>d.box(n,xs[i+1]-245,110,490,55,'fillColor=#FFFFFF;strokeColor=#000000;align=center;whiteSpace=wrap;fontStyle=1;fontSize=18;'));
 for(const [s,e] of [[0,14],[15,m.length-1]])for(let l=1;l<xs.length;l++){
  const inc=m.map((v,i)=>i>=s&&i<=e&&v[1]===l&&!v[3]?i:-1).filter(i=>i>=0);if(!inc.length)continue;
  const out=m.map((v,i)=>i>=inc[0]&&i<=e&&v[0]===l?i:-1).filter(i=>i>=0);
  d.box('',xs[l]-5,first+inc[0]*step,10,(Math.max(...inc,...out)-inc[0])*step+20,'fillColor=#FFFFFF;strokeColor=#000000;');
 }
 m.forEach(([a,b,label,ret],i)=>{const y=first+i*step;if(a===b){d.line([xs[a]+5,y],[xs[a]+5,y+18],'endArrow=block;endFill=1;',[[xs[a]+48,y],[xs[a]+48,y+18]]);d.text(`${i+1}. ${label}`,xs[a]+60,y-29,455,49,'fontSize=16;');}else{d.line([xs[a]+(a?5:0),y],[xs[b]+(b?(b>a?-5:5):0),y],`endArrow=${ret?'open':'block'};endFill=${ret?0:1};${ret?'dashed=1;':''}`);d.text(`${i+1}. ${label}`,Math.min(xs[a],xs[b])+12,y-44,Math.abs(xs[a]-xs[b])-24,41,'fontSize=16;align=center;');}});
 d.text('GET: JWT + SHOP_MANAGER or SYSTEM_ADMIN; UI loads only for SHOP_MANAGER. PUT: SHOP_MANAGER only. Unknown DTO properties are rejected; provided commission must equal 10; window validates numeric 1..365.',25,last+65,w-50,48,'fontSize=17;');
 d.text('UI exposes 7/14/30/60 days and disables the commission input at 10%. There is no minimum-withdrawal editor. Store.minPayoutAmount exists, but payouts use global MIN_PAYOUT_AMOUNT (default 200000.00) through WithdrawalPolicyService.',25,last+120,w-50,48,'fontSize=17;');
 d.text('Later valid referral clicks use the Store window for AttributionSession.expiresAt and cookie maxAge (FR-13). Existing cookies/sessions remain unchanged. ref_link cache TTL=300s can temporarily retain the old setting; saving does not invalidate it.',25,last+175,w-50,48,'fontSize=17;');
 d.text('Validation error 400; missing Store on PUT 404; missing JWT 401; forbidden role 403. UI errors prevent save or show a toast; finally clears saving. Load failure logs to console. Updating owner details separately uses the same PUT endpoint.',25,last+230,w-50,48,'fontSize=17;');
 d.text('GET can create a default Store; PUT never creates one. Save also sends websiteUrl="" and other form fields. Optional logo upload uses uploadService before saving the returned URL; its separate media flow is outside this sequence.',25,last+285,w-50,48,'fontSize=17;');
 return d.page('FR-06 | Store Settings - Sequence',w,last+360,1);
}

D.save(path.join(__dirname,`${base}_Class_Diagram.drawio`),[classes()]);
D.save(path.join(__dirname,`${base}_Sequence_Diagram.drawio`),[sequence()]);
for(const kind of ['Class','Sequence']){
 const xml=fs.readFileSync(path.join(__dirname,`${base}_${kind}_Diagram.drawio`),'utf8');
 fs.writeFileSync(path.join(__dirname,`FR06_${kind}_Paste.xml`),xml.match(/<mxGraphModel\b[\s\S]*?<\/mxGraphModel>/)[0]);
}
console.log('FR06 class, sequence and paste XML generated.');
