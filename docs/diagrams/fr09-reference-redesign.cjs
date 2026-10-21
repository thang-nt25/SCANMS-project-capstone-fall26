const fs=require('fs'),path=require('path'),Uml=require('./fr09-uml-drawing.cjs');
const stem='FR09_Configure_Monthly_Revenue_Bonus_Milestones';
const title='FR-09 Configure Monthly Revenue Bonus Milestones';
function classes(){
 const d=new Uml(2640,2160);
 d.text('title',title+' — Class Diagram',50,24,2540,48,30,'left',true);
 const guard=d.cls('StoreOwnerGuard','StoreOwnerGuard',['- prisma: PrismaService','- jwtService: JwtService','- configService?: ConfigService'],['+ canActivate(context): Promise<boolean>'],60,150,560);
 const controller=d.cls('CommissionRulesController','CommissionRulesController',['- commissionRulesService: CommissionRulesService'],[
  '+ findAll(storeId): Promise<CommissionRuleResponseDto[]>',
  '+ create(storeId, dto, req): Promise<CommissionRuleResponseDto>',
  '+ update(storeId, ruleId, dto, req): Promise<CommissionRuleResponseDto>',
  '+ updateStatus(storeId, ruleId, dto, req)',
  '+ remove(storeId, ruleId, req)',
  '+ previewBonus(storeId, dto): Promise<BonusPreviewResultDto>'
 ],850,150,830);
 const service=d.cls('CommissionRulesService','CommissionRulesService',['- prisma: PrismaService'],[
  '+ findAll(storeId): Promise<CommissionRuleResponseDto[]>',
  '+ create(storeId, dto, userId?, ipAddress?)',
  '+ update(storeId, ruleId, dto, userId?, ipAddress?)',
  '+ updateStatus(storeId, ruleId, statusInput, userId?, ipAddress?)',
  '+ remove(storeId, ruleId, userId?, ipAddress?)',
  '+ previewBonus(storeId, revenueInput?, referenceDate?)',
  '+ calculateProgressiveBonus(rules, revenue, referenceDate?, startDate?)',
  '- verifyStoreExists(storeId): Promise<Store>'
 ],850,700,830);
 const prisma=d.cls('PrismaService','PrismaService',['- pool: Pool','- configService?: ConfigService'],['+ onModuleInit(): Promise<void>','+ onModuleDestroy(): Promise<void>'],850,1280,830);
 const client=d.cls('PrismaClient','PrismaClient',['+ store: Prisma.StoreDelegate','+ commissionRule: Prisma.CommissionRuleDelegate','+ auditLog: Prisma.AuditLogDelegate'],['+ $transaction(callback): Promise<T>','+ $connect(): Promise<void>','+ $disconnect(): Promise<void>'],60,1700,650);
 const store=d.cls('Store','Store',['+ id: string','+ ownerId: string','+ name: string','+ isDeleted: boolean'],[],1930,150,620);
 const rule=d.cls('CommissionRule','CommissionRule',[
  '+ id: string','+ storeId: string','+ name: string','+ description: string | null','+ minMonthlyRevenue: Decimal','+ achievementBonus: Decimal','+ bonusPercentage: Decimal','+ isActive: boolean','+ version: number','+ effectiveFrom, effectiveTo: Date | null','+ isDeleted: boolean','+ deletedAt: Date | null','+ createdBy, updatedBy: string | null','+ createdAt, updatedAt: Date'
 ],[],1930,650,620);
 const audit=d.cls('AuditLog','AuditLog',['+ id: string','+ userId: string | null','+ action: string','+ details: JsonValue | null','+ ipAddress: string | null','+ createdAt: Date'],[],1930,1560,620);
 d.relation('controller_guard',controller,guard,[[850,245],[620,245]],'dependency','«use»',[735,218]);
 d.relation('controller_service',controller,service,[[1265,controller.y+controller.h],[1265,700]],'reference','commissionRulesService',[1450,580]);
 d.relation('service_prisma',service,prisma,[[1265,service.y+service.h],[1265,1280]],'reference','prisma',[1345,1170]);
 d.relation('guard_prisma',guard,prisma,[[340,guard.y+guard.h],[340,1380],[850,1380]],'reference','prisma',[590,1352]);
 d.relation('prisma_inherits_client',prisma,client,[[1265,prisma.y+prisma.h],[1265,1620],[385,1620],[385,1700]],'inheritance','extends',[825,1595]);
 d.relation('prisma_store',prisma,store,[[1680,1330],[1760,1330],[1760,260],[1930,260]],'dependency','«use»',[1795,520]);
 d.relation('prisma_rule',prisma,rule,[[1680,1400],[1840,1400],[1840,950],[1930,950]],'dependency','«use»',[1870,1230]);
 d.relation('prisma_audit',prisma,audit,[[1680,1460],[1795,1460],[1795,1670],[1930,1670]],'dependency','«use»',[1830,1515]);
 d.relation('store_rules',store,rule,[[2240,store.y+store.h],[2240,650]],'association','commissionRules',[2370,520]);
 d.text('store_mult','1',2257,store.y+store.h+10,65,28,18);
 d.text('rule_mult','0..*',2257,612,70,28,18);
 d.text('legend1','+ public member     - private member     Solid arrow: retained reference     Dashed arrow: dependency',60,1985,2500,32,19);
 d.text('legend2','Hollow triangle: actual inheritance (PrismaService extends PrismaClient)     Solid line with multiplicities: model association',60,2025,2500,32,19);
 d.text('scope','Selected configuration members only. Empty operation compartments are intentional for Prisma data models; no fabricated getters, interfaces or repositories.',60,2070,2500,40,18);
 d.validateRouting();return d;
}
function sequence(){
 const d=new Uml(2840,3100),xs=[100,460,1030,1570,2110,2630];
 d.text('title',title+' — Sequence Diagram',45,20,2750,46,28,'left',true);
 d.text('subtitle','Create a monthly revenue bonus milestone',45,73,2750,32,20);
 const messages=[
  [0,1,'Enter milestone details; select Save'],
  [1,2,'POST /api/stores/:storeId/commission-rules'],
  [2,3,'create(storeId, dto, userId, ipAddress)'],
  [3,4,'store.findUnique({ where: { id: storeId } })'],
  [4,5,'SELECT Store by storeId'],[5,4,'Store record',true],[4,3,'Store record',true],
  [3,3,'Validate name, money, percentage and effective dates'],
  [3,4,'$transaction(callback)'],[4,5,'BEGIN'],
  [4,3,'callback(tx)'],
  [3,4,'tx.$executeRawUnsafe(Store advisory lock)'],
  [4,5,'SELECT pg_advisory_xact_lock(Store hash)'],
  [5,4,'Lock acquired',true],[4,3,'Lock acquired',true],
  [3,4,'tx.commissionRule.findFirst(); findMany()'],[4,5,'SELECT non-deleted rules for this Store'],
  [5,4,'Existing threshold and percentage records',true],[4,3,'Existing rules',true],
  [3,3,'Reject duplicate threshold or decreasing percentage'],
  [3,4,'tx.commissionRule.create({ data })'],[4,5,'INSERT CommissionRule (version = 1)'],
  [5,4,'Created rule record',true],[4,3,'Created CommissionRule',true],
  [3,4,'tx.auditLog.create(CREATE_COMMISSION_RULE)'],[4,5,'INSERT AuditLog'],
  [5,4,'Audit record created',true],[4,3,'Audit write completed',true],
  [3,4,'Return serialized rule from transaction callback',true],
  [4,5,'COMMIT'],[5,4,'Commit completed',true],[4,3,'Transaction result',true],
  [3,2,'CommissionRuleResponseDto',true],[2,1,'201 Created: configured milestone',true],
  [1,1,'Close dialog; reset form; loadRules(storeId)'],
  [1,0,'Show success; refresh milestone list',true]
 ];
 const first=245,step=64,last=first+(messages.length-1)*step;
 d.actor('actor_shop','Shop Manager',xs[0],120);
 ['Browser','CommissionRulesController','CommissionRulesService','PrismaService','Database'].forEach((name,i)=>{const lane=i+1,width=i===0?250:i===4?210:430;d.rect('head_'+lane,xs[lane]-width/2,135,width,58);d.text('head_text_'+lane,(lane>1&&lane<5?':':'')+name,xs[lane]-width/2+8,143,width-16,42,20,'center',true);});
 xs.forEach((x,i)=>d.line('lifeline_'+i,[[x,193],[x,last+70]],{dash:true}));
 d.rect('actor_activation',xs[0]-5,first,10,last-first+12);
 d.rect('browser_activation',xs[1]-5,first,10,last-first+12);
 const indexOf=needle=>messages.findIndex(v=>v[2]===needle);
 d.rect('controller_activation',xs[2]-5,first+step,10,(indexOf('201 Created: configured milestone')-1)*step+12);
 d.rect('service_activation',xs[3]-5,first+2*step,10,(indexOf('CommissionRuleResponseDto')-2)*step+12);
 d.rect('prisma_store_activation',xs[4]-5,first+3*step,10,3*step+12);
 d.rect('prisma_transaction_activation',xs[4]-5,first+8*step,10,(indexOf('Transaction result')-8)*step+12);
 const callbackStart=indexOf('callback(tx)'),callbackEnd=indexOf('Return serialized rule from transaction callback');
 d.rect('service_callback_activation',xs[3]+1,first+callbackStart*step,10,(callbackEnd-callbackStart)*step+8);
 for(let index=0;index<messages.length;index++)if(messages[index][1]===5&&!messages[index][3]){
  const end=messages[index+1]?.[0]===5?index+1:index;
  d.rect('db_activation_'+index,xs[5]-5,first+index*step,10,(end-index)*step+18);
 }
 messages.forEach(([from,to,label,ret],i)=>{const y=first+i*step;if(from===to){d.line('message_'+(i+1),[[xs[from]+5,y],[xs[from]+50,y],[xs[from]+50,y+19],[xs[from]+5,y+19]],{arrow:'filled'});d.text('message_text_'+(i+1),`${i+1}. ${label}`,xs[from]+62,y-26,430,46,18);}else{const right=to>from;d.line('message_'+(i+1),[[xs[from]+(right?5:-5),y],[xs[to]+(right?-5:5),y]],{dash:!!ret,arrow:ret?'open':'filled'});d.text('message_text_'+(i+1),`${i+1}. ${label}`,Math.min(xs[from],xs[to])+12,y-49,Math.abs(xs[from]-xs[to])-24,44,18,'center');}});
 d.text('browser_map','Browser = CommissionRulesPage + commissionRulesService HTTP adapter. Core class names match the class diagram.',45,last+110,2750,38,19);
 d.text('auth','Before controller execution: StoreOwnerGuard checks JWT, active user and Store ownership; ParseUUIDPipe and DTO validation run in the NestJS request pipeline.',45,last+160,2750,42,19);
 d.text('failures','Invalid input: 400; unauthorized/forbidden: 401/403; missing Store: 404; duplicate threshold: 409. Failure stops the flow; transaction errors roll back rule and audit.',45,last+215,2750,42,19);
 d.text('scope','Main create flow shown. Edit, activation and soft delete use the same controller/service chain; preview is read-only. No horizontal fragments or object-destruction marks.',45,last+270,2750,42,19);
 d.height=last+350;
 return d;
}
const classModel=classes().save(path.join(__dirname,stem+'_Class_Diagram.drawio'),title+' - Class Diagram');
const seqModel=sequence().save(path.join(__dirname,stem+'_Sequence_Diagram.drawio'),title+' - Sequence Diagram');
fs.writeFileSync(path.join(__dirname,'FR09_Class_Paste.xml'),classModel);
fs.writeFileSync(path.join(__dirname,'FR09_Sequence_Paste.xml'),seqModel);
console.log('FR09 rebuilt: class first, sequence second; routed native connectors and matching paste models.');
