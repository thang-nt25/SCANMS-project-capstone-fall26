const D=require('./drawio-monochrome.cjs');

module.exports=function sequence(){
 const d=new D(),xs=[80,440,960,1510,2080,2660,3190],w=3450;
 const m=[
 [0,1,'Open QR for an existing link / create-link success'],
 [1,1,'Build target from shortUrl + via=qr'],
 [1,1,'useQrDataUrl -> qrcode.toDataURL(width=512)'],
 [1,0,'Show local preview; Retry if preview generation fails',true],
 [0,1,'Choose PNG / SVG and size; click Download'],
 [1,2,'downloadQrCode(id, shortCode, format, size)'],
 [2,3,'GET /api/referral-links/:id/qr + JWT; download=true'],
 [3,3,'Parse format, size and download query'],
 [3,4,'generateQrCode(id, user, options, ip)'],
 [4,4,'Validate png/svg and size 512/1024/2048'],
 [4,6,'findFirst by id or shortCode; deletedAt=null'],
 [6,4,'Link + Store owner + collaborator / not found',true],
 [4,4,'Check owner KOL / Store owner / system support role'],
 [4,5,'checkRateLimit(qr_rl:user:dl, 20, 60s)'],
 [5,4,'Allowed / rate limited',true],
 [4,6,'Only Shop/Admin support: best-effort QR_DOWNLOAD_AUDIT'],
 [4,4,'Build publicAppUrl/r/shortCode?via=qr and filename'],
 [4,5,'GET qr_render:linkId:format:size'],
 [5,4,'Cached PNG base64 / SVG string / cache miss',true],
 [4,4,'On cache hit: restore Buffer for PNG; retain SVG string'],
 [4,4,'On miss: qrcode.toBuffer(PNG) or toString(SVG)'],
 [4,4,'On SVG miss: strip script / handlers / javascript scheme'],
 [4,5,'On miss: SET rendered image, TTL=86400s'],
 [4,5,'If Redis client present: increment download counter, TTL=30d'],
 [4,6,'Increment ReferralLink.qrDownloadCount (best effort)'],
 [6,4,'Counter updated / log failure and continue',true],
 [4,3,'buffer, contentType, filename, shortCode, shortUrl',true],
 [3,2,'200 image bytes + Content-Disposition attachment',true],
 [2,2,'Normalize Blob; create Object URL; click download anchor'],
 [2,1,'Download initiated; resolve Promise<void>',true],
 [1,1,'Update displayed count; clear loading/error'],
 [1,0,'Browser offers SCANMS-QR-shortCode.png / .svg',true],
 [2,2,'After 1 second: revokeObjectURL(blobUrl)']
 ];
 const first=215,step=64,last=first+(m.length-1)*step;
 d.text('FR-11 | Dynamic QR Code: Local Preview and Server Download',25,14,w-50,44,'fontSize=29;fontStyle=1;');
 d.text('One page. Existing ReferralLink required. JwtAuthGuard + RolesGuard run before the QR controller. Cache-hit and cache-miss steps are labelled alternatives.',25,67,w-50,37,'fontSize=17;');
 xs.forEach(x=>d.line([x,165],[x,last+45],'endArrow=none;dashed=1;'));
 d.box('KOL',64,110,32,40,'shape=umlActor;fillColor=#FFFFFF;strokeColor=#000000;verticalLabelPosition=bottom;verticalAlign=top;fontSize=16;');
 ['ReferralLinksPage / useQrDataUrl','referralLinksService (web)','CollaboratorReferralLinksController','ReferralLinksService','CacheService / Redis or RAM','Prisma / PostgreSQL'].forEach((n,i)=>d.box(n,xs[i+1]-230,110,460,55,'fillColor=#FFFFFF;strokeColor=#000000;align=center;whiteSpace=wrap;fontStyle=1;fontSize=18;'));
 for(const [s,e] of [[0,3],[4,m.length-1]])for(let l=1;l<xs.length;l++){
  const inc=m.map((v,i)=>i>=s&&i<=e&&v[1]===l&&!v[3]?i:-1).filter(i=>i>=0);if(!inc.length)continue;
  const out=m.map((v,i)=>i>=inc[0]&&i<=e&&v[0]===l?i:-1).filter(i=>i>=0);
  d.box('',xs[l]-5,first+inc[0]*step,10,(Math.max(...inc,...out)-inc[0])*step+20,'fillColor=#FFFFFF;strokeColor=#000000;');
 }
 m.forEach(([a,b,label,ret],i)=>{const y=first+i*step;if(a===b){d.line([xs[a]+5,y],[xs[a]+5,y+18],'endArrow=block;endFill=1;',[[xs[a]+48,y],[xs[a]+48,y+18]]);d.text(`${i+1}. ${label}`,xs[a]+60,y-29,455,49,'fontSize=16;');}else{d.line([xs[a]+(a?5:0),y],[xs[b]+(b?(b>a?-5:5):0),y],`endArrow=${ret?'open':'block'};endFill=${ret?0:1};${ret?'dashed=1;':''}`);d.text(`${i+1}. ${label}`,Math.min(xs[a],xs[b])+12,y-44,Math.abs(xs[a]-xs[b])-24,41,'fontSize=16;align=center;');}});
 d.text('Preview uses browser qrcode, width 512, margin 4, ECC M; it makes no QR API request. Normal download dialog supports PNG/SVG at 512/1024/2048; the create-success Download button always requests PNG 1024.',25,last+65,w-50,48,'fontSize=17;');
 d.text('KOL downloads own link; Shop Manager must own its Store; SYSTEM_ADMIN / SYSTEM_MANAGER can support. Invalid options 400; missing/deleted link 404; forbidden 403; rate limit 429. UI keeps the dialog and shows errors; it does not substitute the local preview for a failed download.',25,last+120,w-50,48,'fontSize=17;');
 d.text('Counter/support audit failures do not block image delivery. Backend inline preview is a separate API option (60/min, no download count). Status/expiry are enforced on redirect after scanning; QR generation does not reject PAUSED/BLOCKED/expired records solely by status.',25,last+175,w-50,48,'fontSize=17;');
 d.text('QR encodes the stable short URL + via=qr, not a new product link. No separate QR database entity or public QR service is used. Response includes Content-Type, attachment filename, nosniff and private max-age=86400 headers.',25,last+230,w-50,48,'fontSize=17;');
 return d.page('FR-11 | Dynamic QR Preview and Download - Sequence',w,last+305,1);
};
