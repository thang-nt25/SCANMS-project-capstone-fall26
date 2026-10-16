const fs=require('fs'),path=require('path');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('\n','&#xa;');
let cells=[],id=2;
const base='html=0;fontFamily=Arial;fontColor=#000000;';
function box(v,x,y,w,h,s=''){const cid='c'+id++;cells.push(`<mxCell id="${cid}" value="${esc(v)}" style="${base}fontSize=16;${s}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`);return cid;}
function text(v,x,y,w,h=26,s=''){return box(v,x,y,w,h,'text;fillColor=none;strokeColor=none;align=left;whiteSpace=wrap;verticalAlign=middle;'+s);}
function line(x,y,xx,yy,s='',pts=[],term=''){cells.push(`<mxCell id="c${id++}" value="" style="${base}strokeColor=#000000;rounded=0;${s}" edge="1" parent="1" ${term}><mxGeometry relative="1" as="geometry"><mxPoint x="${x}" y="${y}" as="sourcePoint"/><mxPoint x="${xx}" y="${yy}" as="targetPoint"/>${pts.length?'<Array as="points">'+pts.map(p=>`<mxPoint x="${p[0]}" y="${p[1]}"/>`).join('')+'</Array>':''}</mxGeometry></mxCell>`);}
function cls(name,attrs,ops,x,y,w=400){const head=54,ah=attrs.length?attrs.length*26+18:0,oh=ops.length?ops.length*26+18:0,h=head+ah+oh;const cid=box('',x,y,w,h,'fillColor=#FFFFFF;strokeColor=#000000;');text(name,x+8,y+4,w-16,head-8,'fontStyle=1;align=center;');if(ah){line(x,y+head,x+w,y+head,'endArrow=none;');text(attrs.join('\n'),x+12,y+head+6,w-24,ah-12);}if(oh){line(x,y+head+ah,x+w,y+head+ah,'endArrow=none;');text(ops.join('\n'),x+12,y+head+ah+6,w-24,oh-12);}return {cid,x,y,w,h};}
function edge(a,b,p,q,label,pts=[],dep=true){const norm=(f,v)=>[(v[0]-f.x)/f.w,(v[1]-f.y)/f.h];const s=norm(a,p),t=norm(b,q);line(...p,...q,`endArrow=${dep?'open':'none'};${dep?'dashed=1;':''}exitX=${s[0]};exitY=${s[1]};entryX=${t[0]};entryY=${t[1]};exitPerimeter=0;entryPerimeter=0;`,pts,`source="${a.cid}" target="${b.cid}"`);if(label)text(label[0],label[1],label[2],label[3]||150,24,'fontSize=14;align=center;');}
function save(file,title,w,h,page=0){fs.writeFileSync(path.join(__dirname,file),`<mxfile host="app.diagrams.net"><diagram id="fr11" name="${esc(title)}"><mxGraphModel grid="0" page="${page}" pageBreaks="0" pageWidth="${w}" pageHeight="${h}" background="#FFFFFF"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells.join('\n')}</root></mxGraphModel></diagram></mxfile>`);}
// Class diagram is intentionally spacious; selected members belong to FR-11.
text('FR-11 | Generate Dynamic QR Code - Class Diagram',35,20,2200,45,'fontSize=29;fontStyle=1;');
text('Current code: local preview + authenticated server download | No separate QR entity, QR controller or QR DTO',35,75,2200,30,'fontSize=17;');
const page=cls('<<React function>>\nReferralLinksPage',['selectedLinkForQr: ReferralLinkItem | null','createdSuccessLink: ReferralLinkItem | null','selectedQrTargetUrl / createdQrTargetUrl','qrPngSize: 512 | 1024 | 2048','isDownloadingQr: boolean','qrDownloadError: string | null'],['handleDownloadQr(format)','handleDownloadSuccessQr(linkItem)','handleCopyLink(url, code)'],35,150,440);
const hook=cls('<<React hook>> useQrDataUrl',['value?: string | null','dataUrl: string; qrLoading: boolean','qrError: boolean; retryCount: number'],['retry()','useEffect([value, retryCount])'],560,150,400);
const qr=cls('<<external module>> qrcode',[],['toDataURL(value, options)','toBuffer(shortUrl, options)','toString(shortUrl, options)'],1080,150,430);
const client=cls('<<service object>>\nreferralLinksService',[],['downloadQrCode(id, shortCode, format, size)','getQrDownloadUrl(id, format, size)'],35,620,440);
const controller=cls('<<NestJS controller>>\nCollaboratorReferralLinksController',['- service: ReferralLinksService'],['getQrCode(id, user, format, size,','  download, ip, res)'],560,620,400);
const service=cls('<<NestJS service>>\nReferralLinksService',['- prisma: PrismaService','- configService: ConfigService','- cacheService: CacheService','- clickQueue?: ClickQueueService'],['generateQrCode(linkIdOrCode, user,','  options, ipAddress?): Promise<...>','- getPublicAppUrl(): string'],1080,620,430);
const config=cls('<<NestJS class>> ConfigService',[],['get<T>(key): T'],1640,150,480);
const cache=cls('<<NestJS class>> CacheService',['- redisClient: Redis | null','- memoryCache: Map','- rateLimitMap: Map'],['checkRateLimit(key, maxRequests, windowSeconds)','get<T>(key): Promise<T | null>','set(key, value, ttlSeconds)','getRedis(): Redis | null'],1640,430,480);
const prisma=cls('<<infrastructure>> PrismaService',[],['referralLink.findFirst(...)','referralLink.update(...)','auditLog.create(...)'],1640,850,480);
text('PERSISTED MODEL - relevant fields; multiplicities are placed at the corresponding ends',35,1030,2100,35,'fontSize=22;fontStyle=1;');
const user=cls('User',['id: UUID [PK]','role: UserRole','fullName: string'],[],35,1130,350);
const link=cls('ReferralLink',['id: UUID [PK]','collaboratorId: UUID [FK]','storeId / productId: UUID [FK]','shortCode: string [unique]','destinationPath: string','status: ReferralLinkStatus','expiresAt / deletedAt: DateTime?','qrCodeUrl: string?','qrDownloadCount: int = 0'],[],560,1130,450);
const store=cls('Store',['id: UUID [PK]','ownerId: UUID [FK -> User]','name: string'],[],1170,1130,350);
const product=cls('Product',['id: UUID [PK]','storeId: UUID [FK]','title: string'],[],1170,1450,350);
const audit=cls('AuditLog',['id: UUID [PK]','userId: UUID? [FK]','action: string','details: Json?; ipAddress: string?','createdAt: DateTime'],[],1690,1130,430);
edge(page,hook,[475,245],[560,245],['uses',480,215,75]);
edge(hook,qr,[960,245],[1080,245],['toDataURL',965,215,105]);
edge(page,client,[250,474],[250,620],['calls download',270,530,180]);
edge(client,controller,[475,700],[560,700],['GET /qr',478,670,78]);
edge(controller,service,[960,725],[1080,725],['delegates',965,695,105]);
edge(service,qr,[1290,620],[1290,300],['server render',1310,440,160]);
edge(service,cache,[1510,740],[1640,650],['rate limit + cache',1515,765,120],[[1575,740],[1575,650]]);
edge(service,config,[1510,670],[1640,215],['base URL',1530,370,100],[[1540,670],[1540,215]]);
edge(service,prisma,[1510,850],[1640,925],['lookup / count / audit',1485,965,180],[[1570,850],[1570,925]]);
edge(user,link,[385,1230],[560,1230],null,[],false);text('1',395,1198,28);text('0..*',502,1198,52);text('collaborator',401,1240,145,25,'fontSize=14;align=center;');
edge(link,store,[1010,1210],[1170,1210],null,[],false);text('0..*',1018,1178,52);text('1',1132,1178,28);
edge(link,product,[1010,1420],[1170,1530],null,[[1090,1420],[1090,1530]],false);text('0..*',1018,1385,52);text('1',1133,1498,28);
edge(store,product,[1345,1280],[1345,1450],null,[],false);text('1',1360,1290,30);text('0..*',1360,1413,55);
edge(user,audit,[210,1130],[1900,1130],null,[[210,1090],[1900,1090]],false);text('0..1',220,1098,60);text('0..*',1840,1098,55);
text('Store.ownerId -> User: each Store has 1 owner; a User owns 0..* Stores. AuditLog.details.referralLinkId is JSON, not a foreign key.',35,1650,2100,30,'fontSize=16;');
text('QR options and QR result are inline TypeScript object types, not DTO classes. Result: buffer: Buffer|string, contentType, filename, shortCode, shortUrl.',35,1690,2100,30,'fontSize=16;');
text('QR encodes {publicAppUrl}/r/{shortCode}?via=qr. Rendering does not create another ReferralLink; downloading increments qrDownloadCount.',35,1730,2100,30,'fontSize=16;');
text('Status/expiry are enforced later by the redirect interaction. generateQrCode checks deletedAt and ownership, but does not reject PAUSED/BLOCKED/expired links.',35,1770,2100,30,'fontSize=16;');
save('FR11_Generate_Dynamic_QR_Code_Class_Diagram.drawio','FR-11 - Dynamic QR Code - Classes',2170,1830);
// Sequence: local preview is separate from server download.
cells=[];id=2;
text('FR-11 | Generate and Download Dynamic QR Code',25,15,1650,38,'fontSize=26;fontStyle=1;');
text('Precondition: an existing KOL referral link and an authenticated user for the download request.',25,57,1650,26,'fontSize=14;');
const xs=[80,350,640,940,1240,1550];
for(const x of xs)line(x,145,x,1045,'endArrow=none;dashed=1;');
box('KOL',64,85,32,38,'shape=umlActor;fillColor=#FFFFFF;strokeColor=#000000;verticalLabelPosition=bottom;verticalAlign=top;fontSize=14;');
['ReferralLinksPage','CollaboratorReferralLinksController','ReferralLinksService','CacheService','Prisma / PostgreSQL'].forEach((v,i)=>box(v,xs[i+1]-(i===1?151:123),96,i===1?302:246,49,'fillColor=#FFFFFF;strokeColor=#000000;fontStyle=1;align=center;fontSize=13;whiteSpace=wrap;'));
for(const [x,y,h] of [[350,174,125],[350,339,661],[640,378,585],[940,416,510],[1550,450,32],[1240,522,28],[1240,662,33],[1550,889,30]])box('',x-5,y,10,h,'fillColor=#FFFFFF;strokeColor=#000000;');
let n=0;
function msg(a,b,y,v,ret=false){line(xs[a],y,xs[b],y,`endArrow=${ret?'open':'block'};endFill=${ret?0:1};${ret?'dashed=1;':''}`);text(`${++n}. ${v}`,Math.min(xs[a],xs[b])+10,y-27,Math.abs(xs[a]-xs[b])-20,25,'align=center;fontSize=13;');}
function note(v,x,y,w,h=36){box(v,x,y,w,h,'fillColor=#FFFFFF;strokeColor=#000000;align=center;whiteSpace=wrap;fontSize=13;');}
msg(0,1,174,'Open QR for an existing link');
line(355,223,355,238,'endArrow=block;endFill=1;',[[404,223],[404,238]]);
text(`${++n}. useQrDataUrl(shortUrl + ?via=qr)\nQRCode.toDataURL(width=512) - local preview`,420,194,610,45,'fontSize=13;');
msg(1,0,299,'Display QR preview',true);
msg(0,1,339,'Select PNG / SVG and size; Download');
msg(1,2,378,'GET /api/referral-links/:id/qr');
msg(2,3,416,'generateQrCode(id, user, options, ip)');
msg(3,5,450,'Validate format/size; find link + owner/store');
msg(5,3,482,'Non-deleted link / null',true);
msg(3,4,522,'checkRateLimit(user, 20, 60)');
box('',30,565,1625,63,'fillColor=none;strokeColor=#000000;');
text('break [invalid options, missing link, forbidden ownership or rate limited]',40,567,1500,23,'fontStyle=1;fontSize=13;');
msg(3,1,612,'400 / 404 / 403 / 429 via controller and client; display error',true);
msg(3,4,662,'get(qr_render:linkId:format:size)');
msg(4,3,695,'Cached image or cache miss',true);
box('',885,720,770,103,'fillColor=none;strokeColor=#000000;');
text('opt [cache miss]',895,722,730,23,'fontStyle=1;fontSize=13;');
line(945,769,945,783,'endArrow=block;endFill=1;',[[991,769],[991,783]]);
text(`${++n}. qrcode.toBuffer(PNG) / toString(SVG); sanitize SVG`,1004,749,635,26,'fontSize=13;');
msg(3,4,810,'set(rendered image, TTL=86400s)');
note('Image encodes {publicAppUrl}/r/{shortCode}?via=qr; ECC M; quiet zone 4; size 512 / 1024 / 2048.',365,837,1290,30);
msg(3,5,889,'Increment qrDownloadCount; Redis counter if present');
msg(3,2,926,'buffer + contentType + filename',true);
msg(2,1,963,'200 image + attachment headers',true);
msg(1,0,1000,'Save PNG / SVG via Blob URL',true);
note('UI updates local download count. Browser Blob URL is revoked after 1 second. Preview errors offer Retry; download errors keep the dialog open.',365,1014,1290,33);
text('downloadQrCode() uses responseType=blob, format, size, download=true. JWT/role guards run before controller; service checks ownership before rate limiting.',25,1060,1640,28,'fontSize=13;');
text('After creation, preview is also local; its Download button always requests PNG 1024. Standard QR dialog offers PNG/SVG and sizes 512/1024/2048.',25,1093,1640,28,'fontSize=13;');
text('Shop owner / admin support: QR_VIEW_AUDIT or QR_DOWNLOAD_AUDIT before cache lookup. Backend inline preview limit is 60/min; UI preview does not call it.',25,1126,1640,28,'fontSize=13;');
text('Download count and support audit failures are logged without blocking the image. Render failure propagates an error. A later scan follows redirect/tracking with via=qr.',25,1159,1640,28,'fontSize=13;');
save('FR11_Generate_Dynamic_QR_Code_Sequence_Diagram.drawio','FR-11 - Dynamic QR Code - Sequence',1690,1200,1);
console.log('Created FR-11 class diagram, then sequence diagram.');
