const fs=require('fs'),path=require('path'),D=require('./drawio-monochrome.cjs');
const base='FR08_Media_Hub_One_Click_Copy';
function classes(){
 const d=new D(),w=3210;
 d.text('FR-08 | Media Hub, Upload and One-Click Copy - Class Diagram',35,20,w-70,45,'fontSize=29;fontStyle=1;');
 d.text('Actual web: KOL video submission, approved/own media browsing, local text copy and ZIP pack. Shop asset creation exists as API; no caller found in current web.',35,78,w-70,38,'fontSize=18;');
 const hub=d.cls('<<React function>> MediaHubBrowserPage',[
  'mediaList: MediaAsset[]; loading; fetchError','search; selectedProduct; selectedType; viewMode','previewAsset; activeCaptionTab; copiedCaption','activeCoupons; selectedCouponId; packProgress'
 ],['fetchMedia(); handleCopyCaption()','handleDownloadPack(); showToast(message)','handleConfirmDeleteAsset(); filteredMedia [useMemo]'],35,170,630);
 const modal=d.cls('<<React function>> SubmitKolVideoModal',[
  'productId; title; videoUrl; posterUrl; caption','isUploadingVideo/Poster; submitting; errorMsg','campaignId; isCampaignVideo; sampleRequestId?'
 ],['processSelectedVideoFile(file); processSelectedFile(file)','handleSubmit(event); isDomainAllowed(url)','Uses shared api directly for file upload'],850,170,550);
 const web=d.cls('<<web object>> mediaService',[],[
  'getMediaAssets(params)','createMediaAsset(data) [no current web caller found]','submitKolVideo(data); deleteMediaAsset(id)','Uses shared api / JWT / client GET cache'
 ],1600,170,600);
 const ctl=d.cls('<<NestJS controller>> MediaController',['- mediaService: MediaService'],[
  'findAll(query, userId, role)      GET /api/media','create(ownerId, role, dto)      POST /api/media','submitKolVideo(kolId, dto)      POST /kol-submission','reviewMedia(reviewerId, role, id, dto) PATCH /:id/review','delete(ownerId, role, id)        DELETE /:id'
 ],2440,170,700);
 const upload=d.cls('<<NestJS controller>> UploadController',['- cloudinaryService: CloudinaryService'],[
  'uploadImage(file, folder?)  POST /api/upload/image','uploadVideo(file, folder?)  POST /api/upload/video','FileInterceptor(file); no local UseGuards decorators'
 ],35,760,630);
 const cloud=d.cls('<<NestJS service>> CloudinaryService',['- configService: ConfigService'],[
  'onModuleInit(): configure Cloudinary SDK','uploadImage(file, folder); uploadVideo(file, folder)','Check file MIME prefix; stream file.buffer','Return secureUrl, publicId, format, bytes, dimensions'
 ],850,760,550);
 const svc=d.cls('<<NestJS service>> MediaService',[
  '- prisma: PrismaService; - cacheService: CacheService','- static ALLOWED_HOST_DOMAINS'
 ],['findAll(query, viewer)','create(userId, role, dto)','submitKolVideo(collaboratorId, dto)','reviewMedia(reviewerId, role, mediaId, dto)','softDelete(userId, role, id)','validateAllowedUrl(url, fieldName?)'],1600,760,600);
 const dto=d.cls('<<DTOs>> Media requests',[
  'QueryMediaDto: storeId?, productId?, type?, page, limit','CreateMediaDto: storeId?, productId?, title, type, content','SubmitKolVideoDto: productId, title, videoUrl','posterUrl?, caption?, campaignId?, participation flag?','ReviewMediaDto: APPROVED | REJECTED | HIDDEN','rejectionReason when rejected/hidden; isFeatured?','type/content abbreviate assetType/urlOrContent'
 ],[],2440,760,700);
 d.edge(hub,modal,[665,300],[850,300],['opens',685,265,140]);
 d.edge(modal,web,[1400,300],[1600,300],['submit',1420,265,150]);
 d.edge(web,ctl,[2200,300],[2440,300],['JSON API',2230,265,180]);
 d.edge(modal,upload,[1125,modal.y+modal.h],[350,760],['multipart via shared api',500,625,320],[[1125,640],[350,640]]);
 d.edge(upload,cloud,[665,875],[850,875],['streams file',680,840,150]);
 d.edge(ctl,svc,[2440,400],[2200,810],['delegates',2230,600,180],[[2320,400],[2320,810]]);
 d.edge(ctl,dto,[2790,ctl.y+ctl.h],[2790,760],['validates',2810,610,180]);
 d.text('DOMAIN MODEL | solid lines are persisted associations. Browser clipboard operations do not create database records.',35,1200,w-70,42,'fontSize=24;fontStyle=1;');
 const store=d.cls('Store',['id: UUID [PK]; ownerId: UUID [FK -> User]','name; slug; isActive; isDeleted'],[],35,1300,630);
 const prod=d.cls('Product',['id: UUID [PK]; storeId: UUID [FK]','title; sku; price; isDeleted; moderationStatus'],[],850,1300,550);
 const asset=d.cls('MediaAsset',[
  'id: UUID [PK]; storeId: UUID [FK]','productId?; collaboratorId?; reviewedBy?: UUID [FK]','sampleRequestId?: UUID [FK]','assetType: IMAGE | VIDEO | COPYWRITE_TEXT','title; urlOrContent; posterUrl?; caption?','status: PENDING | APPROVED | REJECTED | HIDDEN','isFeatured; rejectionReason?; reviewedAt?','isDeleted; deletedAt?; createdAt; updatedAt'
 ],[],1600,1300,600);
 const user=d.cls('User',['id: UUID [PK]; fullName; role','collaborator media / reviewer media relations'],[],2440,1300,700);
 const collab=d.cls('StoreCollaborator',[
  'id: UUID [PK]; storeId: UUID [FK]','collaboratorId: UUID [FK -> User]; status','APPROVED relation required for KOL library access'
 ],[],35,1780,630);
 const db=d.cls('<<infrastructure>> PrismaService',[],[
  'mediaAsset: count/findMany/create/update','store/product/storeCollaborator queries','campaignProduct lookup when campaign flagged','$transaction: review + featured + audit (+ sample flow)'
 ],850,1780,550);
 const cache=d.cls('<<infrastructure>> CacheService',[],[
  'delPrefix(landing:v2:productId:)','After create/review/delete when asset has productId'
 ],1600,1780,600);
 const browser=d.cls('<<browser / local functions>> Copy and pack',[],[
  'navigator.clipboard.writeText(text)','window.open(mediaUrl, _blank)','buildMediaPack(assets, options): JSZip + fetch','saveMediaPack(blob, filename): anchor + object URL','No server-side copy/count endpoint'
 ],2440,1780,700);
 d.edge(store,prod,[665,1380],[850,1380],['1          0..*',675,1345,160],[],false);
 d.edge(prod,asset,[1400,1380],[1600,1380],['0..1        0..*',1410,1345,180],[],false);
 d.edge(asset,user,[2200,1380],[2440,1380],['0..*   /   0..1 KOL',2210,1345,220],[],false);
 d.edge(store,collab,[350,store.y+store.h],[350,1780],['1 / 0..* memberships',370,1610,260],[],false);
 d.edge(svc,db,[1600,1020],[1125,1780],['queries / reviews',1190,1650,220],[[1490,1020],[1490,1710],[1125,1710]]);
 d.edge(svc,cache,[1900,svc.y+svc.h],[1900,1780],null,[[2360,svc.y+svc.h],[2360,1730],[1900,1730]]);
 d.text('Store -> MediaAsset: 1 to 0..* via storeId (line omitted for space). reviewer User relation is optional; sample and campaign details belong to related workflows.',35,2100,w-70,48,'fontSize=18;');
 d.text('KOL list: active non-deleted Store + APPROVED membership; asset must be approved or submitted by that KOL. Shop list: own non-deleted Store. Admin list is broader.',35,2160,w-70,48,'fontSize=18;');
 d.text('Shop/API create stores APPROVED; KOL submit stores VIDEO/PENDING. File upload and MediaAsset creation are separate requests. No HD resolution requirement is enforced in these paths.',35,2220,w-70,48,'fontSize=18;');
 d.text('Copy uses either stored COPYWRITE_TEXT or four frontend caption templates. Templates use product/Store/user/coupon data, not generated /r short links. Clipboard calls currently have no await/catch.',35,2280,w-70,48,'fontSize=18;');
 return d.page('FR-08 | Media Hub Upload Copy - Classes',w,2360);
}
function sequence(){
 const d=new D(),xs=[80,330,710,1280,1860,2450,3080,3710,4350],w=4650;
 const phases=[[
  [0,4,'API-only alternative: POST /api/media + JWT + CreateMediaDto'],
  [4,5,'create(ownerId, role, dto)'],
  [5,6,'Resolve owned / specified Store; check optional product'],
  [6,5,'Store and optional product membership',true],
  [5,5,'IMAGE/VIDEO: validateAllowedUrl; TEXT: keep content'],
  [5,6,'mediaAsset.create(status=APPROVED, type, urlOrContent)'],
  [6,5,'Created APPROVED asset',true],
  [5,4,'{ message, asset }',true],
  [4,0,'201 Created; no Shop creation form found in current web',true]
 ],[
  [1,2,'Open SubmitKolVideoModal; choose video file'],
  [2,2,'Validate type and <=100 MB; create local preview'],
  [2,3,'Shared api: multipart video; optional poster <=5 MB'],
  [3,7,'POST /api/upload/video?folder=scanms/kol-reviews'],
  [7,7,'UploadController -> CloudinaryService -> SDK upload_stream'],
  [7,3,'201: Cloudinary result with secureUrl',true],
  [3,2,'Set durable videoUrl; poster uses upload/image analog',true],
  [1,2,'Select product; enter title/caption; submit review'],
  [2,3,'mediaService.submitKolVideo(payload)'],
  [3,4,'POST /api/media/kol-submission + JWT + DTO'],
  [4,5,'submitKolVideo(current user id, dto)'],
  [5,5,'Validate video/poster URL protocol and allowed host'],
  [5,6,'Read APPROVED non-deleted Product, Store and membership'],
  [6,5,'Active non-deleted Store + APPROVED StoreCollaborator',true],
  [5,6,'Only if campaign flagged: verify active campaign + ACCEPTED'],
  [5,6,'Create VIDEO/PENDING with collaboratorId; not featured'],
  [6,5,'New review asset',true],
  [5,4,'{ message, asset }; awaiting Shop review',true],
  [4,3,'201 Created: pending submission',true],
  [3,2,'onSuccess -> refresh library / media-updated event',true]
 ],[
  [1,2,'Open /collaborator/marketing?tab=media or refresh'],
  [2,3,'fetchMedia(): getMediaAssets({ limit: 100 })'],
  [3,4,'Client cache miss: GET /api/media + JWT'],
  [4,5,'findAll(query, { id, role })'],
  [5,6,'count + findMany: membership + approved/own + not deleted'],
  [6,5,'Newest assets with Store / Product / collaborator',true],
  [5,4,'{ items, pagination }',true],
  [4,3,'200 OK: library payload',true],
  [3,2,'Set mediaList; loading=false',true],
  [2,1,'Filter locally by title, Store, product, type, own submissions',true]
 ],[
  [1,2,'Click Copy on COPYWRITE_TEXT card / preview'],
  [2,8,'navigator.clipboard.writeText(asset.urlOrContent)'],
  [2,1,'Immediately show copied toast (Promise is not awaited)',true],
  [1,2,'Or choose caption tab and active coupon; Copy Caption'],
  [2,2,'Build short / review / offer / livestream template locally'],
  [2,8,'navigator.clipboard.writeText(captionTemplates[activeTab])'],
  [2,1,'Set copiedCaption; toast; reset copied flag after 2s',true],
  [1,2,'For IMAGE/VIDEO: click Download'],
  [2,8,'window.open(asset.urlOrContent, _blank)'],
  [2,1,'Show download toast; actual browser behavior depends on source',true],
  [1,2,'Optional: download filtered media pack'],
  [2,8,'buildMediaPack: fetch files / TXT / source links -> ZIP'],
  [8,2,'ZIP Blob + downloaded / linked / failed counts',true],
  [2,8,'saveMediaPack: object URL + download anchor; revoke after 60s']
 ]];
 const m=phases.flat(),first=215,step=64,last=first+(m.length-1)*step;
 d.text('FR-08 | Media Upload, KOL Library and One-Click Copy - Sequence Diagram',25,14,w-50,44,'fontSize=29;fontStyle=1;');
 d.text('One page. Independent API creation, KOL upload/submission and library/copy flows. Shop asset creation is API-only in current web. Upload stack grouped in one lane; copy has no backend request.',25,67,w-50,37,'fontSize=17;');
 xs.forEach(x=>d.line([x,165],[x,last+45],'endArrow=none;dashed=1;'));
 for(const [i,n] of [[0,'Shop / Admin API caller'],[1,'KOL']])d.box(n,xs[i]-16,110,32,40,'shape=umlActor;fillColor=#FFFFFF;strokeColor=#000000;verticalLabelPosition=bottom;verticalAlign=top;fontSize=16;');
 ['MediaHubBrowserPage / SubmitKolVideoModal','mediaService / shared api (web)','MediaController','MediaService','Prisma / PostgreSQL','UploadController / CloudinaryService','Browser Clipboard / Download + JSZip'].forEach((n,i)=>d.box(n,xs[i+2]-260,110,520,55,'fillColor=#FFFFFF;strokeColor=#000000;align=center;whiteSpace=wrap;fontStyle=1;fontSize=18;'));
 let start=0;for(const phase of phases){const end=start+phase.length-1;for(let l=2;l<xs.length;l++){
  const inc=m.map((v,i)=>i>=start&&i<=end&&v[1]===l&&!v[3]?i:-1).filter(i=>i>=0);if(!inc.length)continue;
  const out=m.map((v,i)=>i>=inc[0]&&i<=end&&v[0]===l?i:-1).filter(i=>i>=0);
  d.box('',xs[l]-5,first+inc[0]*step,10,(Math.max(...inc,...out)-inc[0])*step+20,'fillColor=#FFFFFF;strokeColor=#000000;');
 }start=end+1;}
 m.forEach(([a,b,label,ret],i)=>{const y=first+i*step;if(a===b){d.line([xs[a]+5,y],[xs[a]+5,y+18],'endArrow=block;endFill=1;',[[xs[a]+48,y],[xs[a]+48,y+18]]);d.text(`${i+1}. ${label}`,xs[a]+60,y-29,485,49,'fontSize=16;');}else{d.line([xs[a]+(a>1?5:0),y],[xs[b]+(b>1?(b>a?-5:5):0),y],`endArrow=${ret?'open':'block'};endFill=${ret?0:1};${ret?'dashed=1;':''}`);d.text(`${i+1}. ${label}`,Math.min(xs[a],xs[b])+12,y-44,Math.abs(xs[a]-xs[b])-24,41,'fontSize=16;align=center;');}});
 d.text('Media API uses JWT + role guards: create/review Shop or system roles; submit COLLABORATOR or SYSTEM_ADMIN; list includes KOL/Shop/system. UploadController has no local UseGuards decorators; it streams bytes and does not create MediaAsset.',25,last+65,w-50,48,'fontSize=17;');
 d.text('KOL list requires APPROVED StoreCollaborator in active non-deleted Store, and shows approved assets or own submissions (even pending/rejected/hidden). Campaign participation is checked only when flagged. Shop review is a separate PATCH flow with ownership, reason rules, transaction/audit and landing-cache invalidation.',25,last+120,w-50,48,'fontSize=17;');
 d.text('Stored text copy and frontend caption copy are different actions. Coupon list loads separately; templates use product SKU/ID in a hardcoded product URL, not a generated affiliate short link. Clipboard rejection is not caught; success UI can appear before writeText finishes.',25,last+175,w-50,48,'fontSize=17;');
 d.text('Upload failure currently sets a local blob URL for video testing; normal submission backend rejects blob: URLs. Modal uploads use shared api directly (default timeout), not uploadService.uploadVideo with its longer timeout. No HD pixel/duration guarantee is checked here.',25,last+230,w-50,48,'fontSize=17;');
 d.text('Single download opens source URL; ZIP generation is local, max 250 MB of media bytes, includes TXT scripts and source links for streaming/unfetchable files. Copy does not generate an API audit/count. Soft-delete and sample-request-specific submissions are related flows outside the main sequence.',25,last+285,w-50,48,'fontSize=17;');
 return d.page('FR-08 | Media Hub Upload and Copy - Sequence',w,last+360,1);
}
D.save(path.join(__dirname,`${base}_Class_Diagram.drawio`),[classes()]);
D.save(path.join(__dirname,`${base}_Sequence_Diagram.drawio`),[sequence()]);
for(const kind of ['Class','Sequence']){const xml=fs.readFileSync(path.join(__dirname,`${base}_${kind}_Diagram.drawio`),'utf8');fs.writeFileSync(path.join(__dirname,`FR08_${kind}_Paste.xml`),xml.match(/<mxGraphModel\b[\s\S]*?<\/mxGraphModel>/)[0]);}
console.log('FR08 class, sequence and paste XML generated.');
