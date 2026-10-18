const path=require('path');
const D=require('./drawio-monochrome.cjs');
const stem='FR09_Configure_Monthly_Revenue_Bonus_Milestones';
function classes(){
 const d=new D();
 d.text('FR-09 | Configure Monthly Revenue Bonus Milestones - Classes',35,20,3060,48,'fontSize=29;fontStyle=1;');
 d.text('Current Shop UI and backend: milestone CRUD, progressive preview, versioned rules and audit. Monthly settlement context is shown separately from configuration.',35,80,3060,40,'fontSize=18;');
 const ui=d.cls('<<React component>> CommissionRulesPage',['storeId; rules: CommissionRule[]; formData','isCreateOpen; editingRule; deletingRule','simRevenue; simResult; simLoading','settleKolId; settleYearMonth; historyList','isReadOnlyAdmin; errorMsg; successMsg'],['loadRules(); loadHistory(); runSimulation(revenue)','handleCreate(); handleUpdate(); handleToggleStatus()','handleDelete(); handleSettleBonus()','handleApprove(); handlePayout()'],35,165,620);
 const api=d.cls('<<frontend object>> commissionRulesService',[],['getRules(storeId); getRule(storeId, ruleId)','createRule(storeId, data); updateRule(storeId, id, data)','updateStatus(storeId, id, isActive); deleteRule(...)','previewBonus(storeId, monthlyRevenue)','settleMonthlyBonus(...); getSettlementHistory(...)','approveSettlement(...); payoutSettlement(...)'],815,165,620);
 const ctrl=d.cls('<<controller>> CommissionRulesController',['- commissionRulesService: CommissionRulesService','@UseGuards(StoreOwnerGuard) [all routes]'],['findAll(storeId); findOne(storeId, ruleId)','create(...); update(...); updateStatus(...)','remove(...); restore(...)','previewBonus(storeId, dto)','settleMonthlyBonus(...); getSettlementHistory(...)'],1595,165,620);
 const svc=d.cls('<<service>> CommissionRulesService',['- prisma: PrismaService','- walletsService: WalletsService'],['findAll(); findOne(); create(); update()','updateStatus(); remove(); restore()','previewBonus(storeId, revenue, referenceDate?)','calculateProgressiveBonus(rules, revenue, end?, start?)','calculateValidMonthlyRevenue(storeId, KOL, month, tx?)','settleMonthlyBonus(...); approveSettlement(...)','payoutSettlement(...); handleRefundAdjustment(...)','- verifyStoreExists(storeId)'],2375,165,700);
 const create=d.cls('<<DTO>> CreateCommissionRuleDto',['name: string [required, max 150]; description?','minMonthlyRevenue: string [positive integer VND]','achievementBonus?: string [nonnegative VND]','bonusPercentage: string [0..100, max 2 decimals]','isActive?: boolean','effectiveFrom? / effectiveTo?: ISO date'],[],35,820,620);
 const update=d.cls('<<DTO>> UpdateCommissionRuleDto',['Optional fields: name; description','minMonthlyRevenue; achievementBonus; bonusPercentage','isActive; effectiveFrom; effectiveTo'],[],815,820,620);
 const guard=d.cls('<<guard>> StoreOwnerGuard',['- prisma: PrismaService; - jwtService: JwtService','- configService?: ConfigService'],['canActivate(context): Promise<boolean>'],1595,820,620);
 const prisma=d.cls('<<infrastructure>> PrismaService',['store; user; commissionRule; auditLog','order; orderRefund; monthlyBonusResult; bonusAdjustment'],['$transaction(callback)','$executeRawUnsafe: pg_advisory_xact_lock [create]'],2375,900,700);
 const preview=d.cls('<<DTO>> PreviewCommissionRuleDto',['monthlyRevenue?: string','revenue?: string [legacy alias]'],[],35,1200,620);
 const result=d.cls('<<DTO>> BonusPreviewResultDto',['monthlyRevenue; highestReachedRule | null','achievementBonus; rangeBonuses[]','totalBonus; formula'],[],815,1200,620);
 const wallet=d.cls('<<service>> WalletsService',[],['creditAvailableBalance(tx, userId, amount, reference, storeId)','Used by payout, not create/update/preview'],1595,1200,620);
 d.text('DOMAIN MODEL - selected fields; solid lines are Prisma relations',35,1550,3060,40,'fontSize=25;fontStyle=1;');
 const store=d.cls('Store',['id: UUID [PK]; ownerId: UUID [FK -> User]','name: string; isDeleted: boolean'],[],35,1640,620);
 const rule=d.cls('CommissionRule',['id: UUID [PK]; storeId: UUID [FK]','name; description?','minMonthlyRevenue / achievementBonus: Decimal','bonusPercentage: Decimal; isActive: boolean','version: int = 1; effectiveFrom?; effectiveTo?','isDeleted; deletedAt?; createdAt; updatedAt','createdBy? / updatedBy?: UUID [scalars]'],[],815,1640,620);
 const settlement=d.cls('MonthlyBonusResult',['id: UUID [PK]','storeId / collaboratorId: UUID [FK]','yearMonth: string; validRevenue: Decimal','appliedRuleId?: UUID [FK]; appliedRuleName?','achievementBonus; bonusPercentage?; bonusAmount','ruleSnapshot?: Json; status: CommissionStatus','settledAt; approvedAt?; paidAt?','walletTransactionId?: UUID [scalar]','unique(storeId, collaboratorId, yearMonth)'],[],1595,1640,620);
 const audit=d.cls('AuditLog',['id: UUID [PK]; userId?: UUID [FK -> User]','action: string; details?: Json','ipAddress?; createdAt','ruleId / Store IDs live inside details JSON'],[],2375,1640,700);
 const user=d.cls('User',['id: UUID [PK]; role: UserRole','isActive; isDeleted'],[],35,2180,620);
 const order=d.cls('Order',['id: UUID [PK]; storeId: UUID [FK]','attributedCollaboratorId?: UUID [FK -> User]','status; completedAt?','finalAmount: Decimal [includes shipping]','refundedAmount: Decimal'],[],815,2180,620);
 const refund=d.cls('OrderRefund',['id: UUID [PK]; orderId: UUID [FK]','amount: Decimal; status: string'],[],1595,2250,620);
 const dep=(a,b,p,q,label,pts=[])=>d.edge(a,b,p,q,label,pts);
 dep(ui,api,[655,300],[815,300],['service calls',660,260,145]);
 dep(api,ctrl,[1435,300],[1595,300],['/stores/:id/commission-rules',1440,252,145]);
 dep(ctrl,svc,[2215,300],[2375,300],['delegates',2220,260,145]);
 dep(ctrl,guard,[1905,ctrl.y+ctrl.h],[1905,820],['authorization',1920,690,200]);
 dep(svc,prisma,[2725,svc.y+svc.h],[2725,900],['read / tx write + audit',2740,770,280]);
 dep(guard,prisma,[2215,900],[2375,990],['user + Store',2220,950,145],[[2295,900],[2295,990]]);
 dep(ui,create,[345,ui.y+ui.h],[345,820],['form payload',360,680,200]);
 dep(preview,result,[655,1260],[815,1260],['read-only preview',660,1220,145]);
 const assoc=(a,b,p,q,l='1',r='0..*',pts=[])=>{d.edge(a,b,p,q,null,pts,false);d.text(l,p[0]+8,p[1]-31,65,24,'fontSize=16;');d.text(r,q[0]-76,q[1]-31,65,24,'fontSize=16;align=right;');};
 assoc(store,rule,[655,1740],[815,1740]);
 assoc(rule,settlement,[1435,1810],[1595,1810],'0..1');
 assoc(user,order,[655,2270],[815,2270],'0..1');
 assoc(order,refund,[1435,2320],[1595,2320]);
 assoc(user,audit,[655,2290],[2375,1780],'0..1','0..*',[[735,2290],[735,2100],[2295,2100],[2295,1780]]);
 d.text('Other relations: Store -> MonthlyBonusResult; User (KOL) -> MonthlyBonusResult; Store -> Order. There is no direct Order -> CommissionRule FK. Audit details and ruleSnapshot are JSON snapshots, not new relation tables.',35,2530,3060,60,'fontSize=18;');
 d.text('Formula: fixed achievement bonus of the highest reached tier + progressive percentage on each exceeded bracket. One 50M tier at 2%, fixed bonus 0: revenue 60M gives (60M - 50M) x 2% = 200,000 VND.',35,2610,3060,60,'fontSize=18;');
 d.text('Create uses a Store advisory lock and audit in one transaction. Full update increments version; delete is soft. Configuration/preview do not credit wallets. Settlement is PENDING, then APPROVED, then explicit payout to PAID.',35,2690,3060,60,'fontSize=18;');
 return d.page('FR-09 | Monthly Revenue Bonus Milestones - Classes',3120,2790,0);
}
function sequence(){
 const d=new D(),xs=[80,440,940,1440,1940,2470,2990],w=3220;
 const m=[
 [0,1,'Open milestone configuration for selected Store'],
 [1,2,'getRules(storeId)'],[2,3,'GET /api/stores/:storeId/commission-rules + JWT'],
 [3,4,'StoreOwnerGuard.canActivate(context)'],[4,6,'Resolve JWT user and selected Store'],[6,4,'User + Store',true],
 [4,3,'Authorize owner; SYSTEM_ADMIN GET only',true],
 [3,5,'findAll(storeId)'],[5,6,'Read nondeleted rules, threshold ascending'],[6,5,'Rules with Decimal fields',true],
 [5,3,'Rules with money/rates serialized as strings',true],[3,2,'200 rules',true],[2,1,'CommissionRule[]',true],[1,0,'Show tier cards and configuration actions',true],
 [0,1,'Enter name, threshold, fixed bonus, rate, active flag'],
 [1,2,'createRule(storeId, trimmed formData)'],[2,3,'POST /api/stores/:storeId/commission-rules'],
 [3,4,'Recheck Store ownership (request DTO validated separately)'],[4,3,'Allowed Shop owner',true],
 [3,5,'create(storeId, dto, userId, ip)'],[5,5,'Check Store; Decimal ranges; effective date interval'],
 [5,6,'BEGIN; pg_advisory_xact_lock(Store hash)'],[5,6,'Read existing thresholds and percentage hierarchy'],[6,5,'All nondeleted Store rules',true],
 [5,5,'Reject duplicate threshold / decreasing rate hierarchy'],
 [5,6,'Insert CommissionRule: version=1; effectiveFrom default now'],[5,6,'Insert AuditLog: CREATE_COMMISSION_RULE'],[6,5,'COMMIT both writes; rollback on any failure',true],
 [5,3,'Created rule (Decimal strings)',true],[3,2,'201 Created',true],[2,1,'New milestone',true],
 [1,1,'Close modal; reset form; loadRules()'],[1,0,'Show saved rule after GET reload',true],
 [0,1,'Enter simulated monthly revenue'],[1,2,'After 400ms debounce: previewBonus(storeId, revenue)'],[2,3,'POST /stores/:storeId/commission-rules/preview'],
 [3,4,'Preview: authenticated active user + existing Store'],[4,3,'Read-only preview allowed',true],
 [3,5,'previewBonus(storeId, revenueInput)'],[5,6,'Read Store rules (nondeleted)'],[6,5,'Rule list',true],
 [5,5,'calculateProgressiveBonus: active/effective tiers + brackets'],
 [5,3,'Fixed bonus + brackets + total + formula',true],[3,2,'Preview response',true],[2,1,'BonusPreviewResult',true],[1,0,'Display calculation; no settlement or wallet write',true]
 ];
 const first=215,step=58,last=first+(m.length-1)*step;
 d.text('FR-09 | Configure Revenue Milestones and Preview Progressive Bonus',25,14,w-50,44,'fontSize=29;fontStyle=1;');
 d.text('Single page. Main flow: load -> create -> reload -> simulate. Repeated Store checks are summarized. Failures stop the operation and appear in the form.',25,67,w-50,37,'fontSize=17;');
 xs.forEach(x=>d.line([x,165],[x,last+45],'endArrow=none;dashed=1;'));
 d.box('Shop Manager',64,110,32,40,'shape=umlActor;fillColor=#FFFFFF;strokeColor=#000000;verticalLabelPosition=bottom;verticalAlign=top;fontSize=16;');
 ['CommissionRulesPage','commissionRulesService (web)','CommissionRulesController','StoreOwnerGuard','CommissionRulesService','Prisma / PostgreSQL'].forEach((n,i)=>d.box(n,xs[i+1]-210,110,420,55,'fillColor=#FFFFFF;strokeColor=#000000;align=center;whiteSpace=wrap;fontStyle=1;fontSize=18;'));
 for(const [s,e] of [[0,13],[14,32],[33,m.length-1]])for(let l=1;l<xs.length;l++){
  const inc=m.map((v,i)=>i>=s&&i<=e&&v[1]===l&&!v[3]?i:-1).filter(i=>i>=0);if(!inc.length)continue;
  const out=m.map((v,i)=>i>=inc[0]&&i<=e&&v[0]===l?i:-1).filter(i=>i>=0);
  d.box('',xs[l]-5,first+inc[0]*step,10,(Math.max(...inc,...out)-inc[0])*step+20,'fillColor=#FFFFFF;strokeColor=#000000;');
 }
 m.forEach(([a,b,label,ret],i)=>{const y=first+i*step;if(a===b){d.line([xs[a]+5,y],[xs[a]+5,y+18],'endArrow=block;endFill=1;',[[xs[a]+48,y],[xs[a]+48,y+18]]);d.text(`${i+1}. ${label}`,xs[a]+60,y-29,425,49,'fontSize=16;');}else{d.line([xs[a]+(a?5:0),y],[xs[b]+(b?(b>a?-5:5):0),y],`endArrow=${ret?'open':'block'};endFill=${ret?0:1};${ret?'dashed=1;':''}`);d.text(`${i+1}. ${label}`,Math.min(xs[a],xs[b])+12,y-44,Math.abs(xs[a]-xs[b])-24,41,'fontSize=16;align=center;');}});
 d.text('Other configuration actions use the same UI -> web service -> guarded controller -> service -> DB path: PATCH /:ruleId (edit, version + 1); PATCH /:ruleId/status; DELETE /:ruleId (soft delete). Each writes audit in its transaction; frontend reloads rules.',25,last+65,w-50,48,'fontSize=17;');
 d.text('Preview also runs automatically when rules/revenue change. Restore exists in backend; no restore button is shown by this UI. Date fields exist in backend DTOs but the current create/edit form does not send them. Update does not use the create advisory lock.',25,last+120,w-50,48,'fontSize=17;');
 d.text('Monthly settlement is a separate explicit action: COMPLETED orders in Vietnam month, net of refunds -> PENDING result snapshot -> approve -> payout. Creating or previewing a milestone does not change historical payouts or credit a wallet.',25,last+175,w-50,48,'fontSize=17;');
 return d.page('FR-09 | Configure and Preview Revenue Milestones - Sequence',w,last+245,1);
}
D.save(path.join(__dirname,`${stem}_Class_Diagram.drawio`),[classes()]);
console.log('Created FR-09 class diagram.');
D.save(path.join(__dirname,`${stem}_Sequence_Diagram.drawio`),[sequence()]);
console.log('Created FR-09 single-page sequence diagram.');
