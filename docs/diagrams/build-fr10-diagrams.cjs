const fs = require('fs');
const path = require('path');
const esc = s => String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('\n','&#xa;');
let cells=[], id=2;
const classFrames=[];
const base='html=0;fontFamily=Arial;fontColor=#000000;';
function box(v,x,y,w,h,s=''){const cid='c'+id++;cells.push(`<mxCell id="${cid}" value="${esc(v)}" style="${base}fontSize=16;${s}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`);return cid;}
function line(x,y,xx,yy,s='',pts=[]){cells.push(`<mxCell id="c${id++}" value="" style="${base}strokeColor=#000000;${s}" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="${x}" y="${y}" as="sourcePoint"/><mxPoint x="${xx}" y="${yy}" as="targetPoint"/>${pts.length?'<Array as="points">'+pts.map(p=>`<mxPoint x="${p[0]}" y="${p[1]}"/>`).join('')+'</Array>':''}</mxGeometry></mxCell>`);}
function text(v,x,y,w,h=26,s=''){return box(v,x,y,w,h,'text;fillColor=none;strokeColor=none;align=left;verticalAlign=middle;whiteSpace=wrap;'+s);}
function cls(title,attrs,ops,x,y,w=350){const head=48,ah=attrs.length*25+16,oh=ops.length?ops.length*25+16:0,h=head+ah+oh;const cid=box('',x,y,w,h,'fillColor=#FFFFFF;strokeColor=#000000;');classFrames.push({cid,x,y,w,h});text(title,x+8,y+3,w-16,head-6,'align=center;fontStyle=1;');line(x,y+head,x+w,y+head,'endArrow=none;');text(attrs.join('\n'),x+12,y+head+6,w-24,ah-12,'fontSize=16;');if(ops.length){line(x,y+head+ah,x+w,y+head+ah,'endArrow=none;');text(ops.join('\n'),x+12,y+head+ah+6,w-24,oh-12,'fontSize=16;');}return {x,y,w,h};}
function rel(a,b,label,pts=[],dash=true){
 const frameAt=p=>classFrames.find(f=>p[0]>=f.x-2&&p[0]<=f.x+f.w+2&&p[1]>=f.y-2&&p[1]<=f.y+f.h+2&&Math.min(Math.abs(p[0]-f.x),Math.abs(p[0]-f.x-f.w),Math.abs(p[1]-f.y),Math.abs(p[1]-f.y-f.h))<=2);
 const source=frameAt(a),target=frameAt(b);
 if(!source||!target)throw new Error('Unattached class relationship: '+JSON.stringify({a,b}));
 const anchor=(p,f)=>[Math.max(0,Math.min(1,(p[0]-f.x)/f.w)),Math.max(0,Math.min(1,(p[1]-f.y)/f.h))];
 const start=anchor(a,source),end=anchor(b,target);
 line(a[0],a[1],b[0],b[1],`exitX=${start[0]};exitY=${start[1]};entryX=${end[0]};entryY=${end[1]};exitPerimeter=0;entryPerimeter=0;endArrow=${dash?'open':'none'};${dash?'dashed=1;':''}`,pts);
 cells[cells.length-1]=cells[cells.length-1].replace('edge="1" parent="1"',`edge="1" parent="1" source="${source.cid}" target="${target.cid}"`);
 if(label)text(label[0],label[1],label[2],label[3]||210,25,'align=center;fontSize=14;');
}
function save(name,title,w,h){const page=name.includes('Class_Diagram')?'0':'1';fs.writeFileSync(path.join(__dirname,name),`<mxfile host="app.diagrams.net"><diagram id="fr10" name="${esc(title)}"><mxGraphModel grid="0" page="${page}" pageBreaks="0" pageWidth="${w}" pageHeight="${h}" background="#FFFFFF"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells.join('\n')}</root></mxGraphModel></diagram></mxfile>`);}
// CLASS DIAGRAM: implementation types above, relevant Prisma models below.
text('FR-10 | Create Short Affiliate Link - Class Diagram',35,20,1850,45,'fontSize=28;fontStyle=1;');
text('Current implementation | React functions / service object / NestJS classes / Prisma models | Relevant members only',35,72,1850,28,'fontSize=17;');
cls('<<React function>>\nReferralLinksPage',['selectedProduct: EligibleProduct | null','formLabel, formChannel: string','selectedCampaignId: string','formCoupon, customExpiresAt: string','utmSource / Medium / Campaign / Content','createdSuccessLink: ReferralLinkItem | null'],['handleOpenCreateModal()','loadEligibleProductsAndCampaigns()','handleSelectProduct(prod)','handleSelectCampaign(campId)','handleCreateSubmit(event?)','handleCopyLink(url, code)','fetchLinks()'],35,135,400);
cls('<<service object>>\nreferralLinksService',[],['getEligibleProducts(params?)','createLink(payload): Promise<ReferralLinkItem>','getMyLinks(params?)'],510,135,460);
cls('<<NestJS controller>>\nCollaboratorReferralLinksController',['- service: ReferralLinksService'],['getEligibleProducts(collaboratorId, ...)','createLink(collaboratorId, dto, ip)'],1060,135,430);
cls('<<DTO>> CreateReferralLinkDto',['productId: UUID','label: string [required, max 150]','channel: SocialPlatform [required]','campaignId?: UUID','exclusiveDealId?: UUID','customCouponCode?: string','utmSource / Medium / Campaign / Content?','expiresAt?: ISO date string'],[],1570,135,425);
cls('<<NestJS service>>\nReferralLinksService',['- prisma: PrismaService','- configService: ConfigService','- cacheService: CacheService','- clickQueue?: ClickQueueService'],['getEligibleProducts(collaboratorId, query)','createReferralLink(collaboratorId, dto, ip?)','- getPublicAppUrl(): string'],1060,480,430);
cls('<<imported functions>>\nshort-code.generator.ts',[],['generateShortCode(length = 8): string','sanitizeUtmString(text, maxLength): string'],1570,500,425);
cls('<<infrastructure>> PrismaService',[],['user / product / campaign / referralLink','campaignParticipant / campaignProduct','exclusiveDealProposal / auditLog','$transaction(callback)'],510,485,460);
text('Request pipeline: JwtAuthGuard + RolesGuard (COLLABORATOR) + global ValidationPipe.',35,620,400,85,'fontSize=16;');
text('ConfigService resolves PUBLIC_APP_URL, then FRONTEND_URL, then http://localhost:5173. shortUrl is a response field; it is not stored in ReferralLink.',1570,695,425,100,'fontSize=16;');
rel([435,250],[510,250],['calls',438,220,70]);
rel([970,220],[1060,220],['HTTP',980,190,70]);
rel([1275,288],[1275,480],['delegates',1290,375,130]);
rel([1490,235],[1570,235],['accepts',1495,205,70]);
rel([1490,590],[1570,590],['calls',1497,560,65]);
rel([1060,665],[970,665],['queries',975,632,80]);
text('DOMAIN MODEL - persisted relations and creation constraints',35,830,1900,35,'fontSize=22;fontStyle=1;');
cls('User',['id: UUID [PK]','role: UserRole','isActive: boolean','deletedAt: DateTime?'],[],35,910,335);
cls('CollaboratorProfile',['id: UUID [PK]','userId: UUID [FK, unique]','kycStatus: KycStatus'],[],35,1180,335);
cls('Product',['id: UUID [PK]','storeId: UUID [FK]','title: string','price: Decimal','isActive: boolean','isAffiliateEnabled: boolean','moderationStatus: enum','customCommissionRate: Decimal?','deletedAt: DateTime?'],[],460,910,355);
cls('ReferralLink',['id: UUID [PK]','collaboratorId / storeId / productId: UUID [FK]','campaignId?: UUID [FK]','exclusiveDealId?: UUID [FK, unique]','shortCode: string [unique]','label?: string; channel?: SocialPlatform','destinationPath: string','utmSource / Medium / Campaign / Content?','customCouponCode?: string','status: ReferralLinkStatus = ACTIVE','expiresAt?: DateTime; deletedAt?: DateTime','qrCodeUrl?: string','totalClicks / uniqueClicks / totalOrders: int','createdAt / updatedAt: DateTime'],[],930,910,540);
cls('Store',['id: UUID [PK]','name: string; slug: string','isActive / isDeleted: boolean','deletedAt: DateTime?','defaultCommissionRate: Decimal'],[],1570,910,425);
cls('Campaign',['id: UUID [PK]','storeId: UUID [FK]','name: string; isActive: boolean','startDate / endDate: DateTime'],[],1570,1180,425);
cls('CampaignParticipant',['id: UUID [PK]','campaignId / collaboratorId: UUID [FK]','status: CampaignParticipantStatus','unique(campaignId, collaboratorId)'],[],35,1470,400);
cls('CampaignProduct',['id: UUID [PK]','campaignId / productId: UUID [FK]','unique(campaignId, productId)'],[],510,1470,390);
cls('ExclusiveDealProposal',['id: UUID [PK]','collaboratorId / storeId / productId: UUID','status: ExclusiveDealStatus','approvedCommissionRate?: Decimal'],[],1000,1470,470);
cls('AuditLog',['id: UUID [PK]; userId?: UUID [FK]','action: string; details?: Json','ipAddress?: string; createdAt: DateTime'],[],1570,1470,425);
// Multiplicities are labels on plain UML associations, never inheritance.
rel([202,1074],[202,1180],['1       0..1',215,1110,140],[],false);
rel([370,948],[930,948],['collaborator 1 : 0..* links',530,865,310],[[415,948],[415,888],[880,888],[880,948]],false);
rel([815,1050],[930,1050],['1 : 0..*',820,1020,105],[],false);
rel([1470,970],[1570,970],['0..* : 1',1475,940,90],[],false);
rel([1750,1099],[1750,1180],['1 : 0..*',1765,1123,110],[],false);
rel([1470,1260],[1570,1260],['0..* : 0..1',1473,1228,95],[],false);
rel([630,1199],[630,1470],['1 : 0..*',645,1398,130],[],false);
rel([370,1030],[235,1470],['1 : 0..*',240,1390,130],[[395,1030],[395,1400],[235,1400]],false);
rel([1570,1325],[435,1555],['Campaign 1 : 0..* participants',480,1405,370],[[1530,1325],[1530,1435],[455,1435],[455,1555]],false);
rel([1690,1344],[900,1555],['Campaign 1 : 0..* products',920,1338,330],[[1690,1380],[920,1380],[920,1555]],false);
rel([1225,1470],[1225,1324],['0..1 : 0..1',1250,1450,150],[],false);
text('Store 1 : 0..* Product. ExclusiveDealProposal references User, Store and Product (each 1 : 0..*). AuditLog.userId references User (0..1 : 0..*).',35,1715,1940,30,'fontSize=16;');
text('AuditLog.details contains referralLinkId as JSON; there is no ReferralLink-AuditLog foreign key. ReferralLinkItem adds computed shortUrl and nested product/store.',35,1750,1940,30,'fontSize=16;');
text('Scope: creation of ordinary/campaign links and backend Exclusive Deal option. QR rendering, click tracking, attribution and payouts are separate interactions.',35,1790,1940,30,'fontSize=16;');
save('FR10_Create_Short_Affiliate_Link_Class_Diagram.drawio','FR-10 - Create Short Affiliate Link - Classes',2030,1850);
// Single-page sequence in the supplied reference style.
const D = require('./drawio-monochrome.cjs');
D.save(path.join(__dirname, 'FR10_Create_Short_Affiliate_Link_Sequence_Diagram.drawio'), [require('./fr10-single-page-sequence.cjs')()]);
console.log('Created FR-10 class diagram, then single-page sequence diagram.');