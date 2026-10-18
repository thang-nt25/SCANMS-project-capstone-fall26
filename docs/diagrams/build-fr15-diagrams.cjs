const D=require('./drawio-monochrome.cjs');
const path=require('path');
function classes(){
 const d=new D();
 d.text('FR-15 | Public Product Landing Page and KOL Video Reviews - Classes',35,20,2930,48,'fontSize=29;fontStyle=1;');
 d.text('Selected components and persisted relationships from the current implementation. Public browsing, video playback and purchase entry; checkout internals omitted.',35,80,2930,38,'fontSize=18;');
 const page=d.cls('<<React function>> ProductDetailPage',['data: LandingData | null; loading; error','selectedVariant; selectedImage; quantity','activeVideoIndex; videoRef: HTMLVideoElement','isPlaying; isMuted; showCaptions; playbackSpeed','isCheckoutOpen; analyticsConsent'],['loadLanding() [inside useEffect]','togglePlay(); toggleMute(); handleFullscreen()','handleBuyNow(source); handleCloseCheckout()','trackAnalytics(eventName, payload) [module function]'],35,165,610);
 const ctrl=d.cls('<<controller>> PublicProductsController',['- productsService: ProductsService','- configService: ConfigService'],['getLandingPage(idOrSlug, req)','trackAnalytics(dto, req)','getSeoPreview(idOrSlug, res, req)'],805,165,565);
 const svc=d.cls('<<service>> ProductsService',['- prisma: PrismaService','- configService: ConfigService','- cacheService: CacheService'],['getLandingPageData(idOrSlug, cookie?)','recordAnalyticsEvent(dto, context?)','invalidateLandingCache(productId?)','getRealtimeStock(idOrSlug) [no route found]','- isSafeUrl(url); - maskCustomerName(name)'],1530,165,650);
 const cache=d.cls('<<service>> CacheService',['redisClient: Redis | null','memoryCache: Map','landing:v2:{productId}:{visitorHash | anon}'],['get<T>(key); set(key, value, ttlSeconds)','delPrefix(prefix)','checkRateLimit(key, maxRequests, windowSeconds)'],2340,165,625);
 const video=d.cls('<<browser>> HTMLVideoElement',['src: activeVideo.videoUrl','poster: activeVideo.posterUrl','muted; playbackRate; playsInline'],['play(): Promise<void>; pause()','requestFullscreen()','onEnded -> video_complete'],35,790,610);
 const cart=d.cls('<<React context>> CartProvider / useCart',['cart: CartItem[]','selectedItemIds; localStorage persistence'],['addItem({product, store, variantId, quantity, ...})'],805,790,565);
 const checkout=d.cls('<<React component>> GuestCheckoutModal',['product; store; initialVariantId','initialQuantity; initialCouponCode','isOpen; onClose; onOrderPlaced'],['handleSubmitOrder(event)'],1530,790,650);
 const prisma=d.cls('<<infrastructure>> PrismaService',['product; mediaAsset; productReview','attributionSession; auditLog'],['findFirst / findMany / findUnique','auditLog.create(data)'],2340,790,625);
 const dto=d.cls('<<response DTO>> ProductLandingResponseDto',['status: string','product: LandingProductDto','store: LandingStoreDto','images: string[]; videos: LandingVideoDto[]','reviews: LandingReviewsDto','availability: LandingAvailabilityDto','policies: LandingPoliciesDto'],[],35,1210,610);
 const vd=d.cls('<<DTO>> LandingVideoDto',['id; title; videoUrl; posterUrl; caption','kol: LandingKolInfoDto','isFeatured?; isReferredKol?'],[],805,1210,565);
 const rd=d.cls('<<DTO>> LandingReviewsDto',['averageRating: number | null','totalReviews: number; starDistribution: Record','items: LandingReviewItemDto[]','masked customerName; isVerifiedBuyer'],[],1530,1210,650);
 const ad=d.cls('<<DTO>> TrackAnalyticsEventDto',['eventId: UUID v4; event: LandingAnalyticsEvent','productId? / storeId?: UUID','metadata?: Record<string, any>'],[],2340,1210,625);
 d.text('DOMAIN MODEL - selected fields; solid lines are actual Prisma associations',35,1610,2930,40,'fontSize=25;fontStyle=1;');
 const store=d.cls('Store',['id: UUID [PK]; ownerId: UUID [FK]','isActive / isVerified / isDeleted: boolean','onboardingStatus; name; slug','policyReturn / policyWarranty / policyShipping'],[],35,1700,610);
 const prod=d.cls('Product',['id: UUID [PK]; storeId: UUID [FK]','sku; title; description; imageUrl','price / originalPrice: Decimal','stockQuantity; isActive; isDeleted','moderationStatus: ProductModerationStatus'],[],805,1700,565);
 const media=d.cls('MediaAsset',['id: UUID [PK]; storeId: UUID [FK]','productId?: UUID [FK]','collaboratorId?: UUID [FK -> User]','assetType: IMAGE | VIDEO | ...','urlOrContent; posterUrl?; caption?','status: MediaAssetStatus; isFeatured; isDeleted'],[],1530,1700,650);
 const user=d.cls('User / CollaboratorProfile',['User.id: UUID [PK]; fullName; isActive','Profile.userId: UUID [unique FK]','Profile.kycStatus -> KOL verified badge'],[],2340,1700,625);
 const vari=d.cls('ProductVariant',['id: UUID [PK]; productId: UUID [FK]','sku: string [unique]; name; attributes: Json','price?: Decimal; stockQuantity; isActive'],[],805,2160,565);
 const review=d.cls('ProductReview',['id: UUID [PK]; productId: UUID [FK]','orderId?: UUID [FK -> Order]','customerName?; rating; comment?','isApproved: boolean; createdAt'],[],1530,2160,650);
 const sess=d.cls('AttributionSession',['storeId; visitorIdHash [composite unique]','collaboratorId; referralLinkId [FK]','status; expiresAt','Used to prioritize the referring KOL video'],[],2340,2160,625);
 const dep=(a,b,p,q,l,pts=[])=>d.edge(a,b,p,q,l,pts);
 dep(page,ctrl,[645,290],[805,290],['GET landing',650,255,150]);
 dep(ctrl,svc,[1370,290],[1530,290],['delegates',1375,255,150]);
 dep(svc,cache,[2180,290],[2340,290],['cache / limit',2185,255,150]);
 dep(page,video,[340,page.y+page.h],[340,790],['videoRef',355,670,140]);
 dep(page,cart,[645,420],[805,880],['useCart().addItem',650,675,150],[[720,420],[720,880]]);
 dep(page,checkout,[645,450],[1530,880],['open purchase form',1030,680,230],[[680,450],[680,720],[1450,720],[1450,880]]);
 dep(svc,prisma,[2180,430],[2340,880],['reads / audit',2185,680,150],[[2250,430],[2250,880]]);
 dep(dto,vd,[645,1320],[805,1320],['videos: 0..*',650,1287,150]);
 dep(dto,rd,[645,1390],[1530,1340],['reviews: 1',1030,1510,180],[[720,1390],[720,1490],[1450,1490],[1450,1340]]);
 const assoc=(a,b,p,q,left='1',right='0..*',pts=[])=>{d.edge(a,b,p,q,null,pts,false);d.text(left,p[0]+8,p[1]-31,60,24,'fontSize=16;');d.text(right,q[0]-72,q[1]-31,62,24,'fontSize=16;align=right;');};
 assoc(store,prod,[645,1810],[805,1810]);
 assoc(prod,media,[1370,1830],[1530,1830],'0..1');
 assoc(media,user,[2180,1850],[2340,1850],'0..*','0..1');
 assoc(prod,vari,[1085,prod.y+prod.h],[1085,2160]);
 assoc(prod,review,[1370,1880],[1530,2270],'1','0..*',[[1430,1880],[1430,2270]]);
 d.text('Video reviews are approved MediaAsset records; customer ratings are ProductReview records. Store -> MediaAsset and review -> Order also exist; their fields are shown to avoid crossing lines.',35,2490,2930,52,'fontSize=18;');
 d.text('Backend orders videos by referral KOL, featured, newest. Frontend additionally merges approved localStorage submissions and sorts featured first. The browser requests media URLs directly; no player SDK / embed conversion is used here.',35,2560,2930,60,'fontSize=18;');
 d.text('Analytics is consent-gated. Cache TTL is 30s after product/Store checks. Inactive or out-of-stock products can still render with purchasing disabled. Anonymous structural frontend interfaces mirror the response DTO.',35,2640,2930,55,'fontSize=18;');
 return d.page('FR-15 | Product Landing and Video Review - Classes',3000,2730,0);
}
function sequence(){
 const d=new D(),xs=[80,440,920,1400,1880,2360,2820],w=3040;
 const m=[
 [0,1,'Open /products/:slug'],[1,2,'GET /api/public/products/:slug/landing + cookies'],[2,3,'getLandingPageData(slug, attrCookie)'],
 [3,3,'Verify cookie; derive visitor hash if valid'],[3,5,'Find approved product, active variants + Store/owner'],[5,3,'Product and related records',true],
 [3,3,'Check Store verified/active; owner active'],[3,4,'GET landing:v2:productId:visitorHash-or-anon'],[4,3,'Cached payload / miss',true],
 [3,5,'On miss + visitor hash: read Store attribution session'],[5,3,'Active session/link or no referral priority',true],
 [3,5,'On miss: approved nondeleted MediaAssets + KOL profile'],[5,3,'Gallery and video assets',true],
 [3,5,'On miss: latest 50 approved reviews + Order status'],[5,3,'Customer reviews',true],
 [3,3,'On miss: safe URLs; sort videos; mask names; compute stock'],[3,4,'On miss: SET public payload, TTL=30s'],
 [3,2,'ProductLandingResponseDto (cached or built)',true],[2,1,'200: product, Store, images, videos, reviews, policies',true],
 [1,1,'Merge local approved videos; featured first; select variant'],[1,0,'Render landing and update SEO metadata',true],
 [0,1,'Select review video; click Play'],[1,6,'HTMLVideoElement.play(): request video URL'],[6,1,'Media playback / playback error',true],
 [1,2,'If playback starts + consent: POST analytics/events'],[2,3,'recordAnalyticsEvent(dto, trusted IP/UA)'],
 [3,4,'checkRateLimit(analytics IP hash, 60, 60s)'],[4,3,'Allowed / limited',true],
 [3,5,'If allowed: create AuditLog by eventId'],[5,3,'Recorded / duplicate / write failed',true],
 [3,2,'Analytics result; 429 if limited',true],[2,1,'Best-effort response; playback continues',true],
 [0,1,'Choose variant/quantity; click Buy now'],[1,6,'Open GuestCheckoutModal with product/Store/variant'],[6,0,'Display purchase form',true]
 ];
 const first=215,step=59,last=first+(m.length-1)*step;
 d.text('FR-15 | Product Landing Page, KOL Review Video and Purchase Entry',25,14,w-50,44,'fontSize=29;fontStyle=1;');
 d.text('One page. Cache-miss calls are guarded; cache hits skip rebuilding. Browser media and checkout share the final lifeline for readability.',25,67,w-50,36,'fontSize=17;');
 xs.forEach(x=>d.line([x,165],[x,last+45],'endArrow=none;dashed=1;'));
 d.box('Visitor / Customer',64,110,32,40,'shape=umlActor;fillColor=#FFFFFF;strokeColor=#000000;verticalLabelPosition=bottom;verticalAlign=top;fontSize=16;');
 ['ProductDetailPage','PublicProductsController','ProductsService','CacheService / Redis or RAM','Prisma / PostgreSQL','Browser Video / Checkout'].forEach((n,i)=>d.box(n,xs[i+1]-195,110,390,55,'fillColor=#FFFFFF;strokeColor=#000000;align=center;whiteSpace=wrap;fontStyle=1;fontSize=18;'));
 for(const [s,e] of [[0,20],[21,23],[24,31],[32,34]])for(let l=1;l<xs.length;l++){
  const inc=m.map((v,i)=>i>=s&&i<=e&&v[1]===l&&!v[3]?i:-1).filter(i=>i>=0);if(!inc.length)continue;
  const out=m.map((v,i)=>i>=inc[0]&&i<=e&&v[0]===l?i:-1).filter(i=>i>=0);
  d.box('',xs[l]-5,first+inc[0]*step,10,(Math.max(...inc,...out)-inc[0])*step+20,'fillColor=#FFFFFF;strokeColor=#000000;');
 }
 m.forEach(([a,b,label,ret],i)=>{const y=first+i*step;if(a===b){d.line([xs[a]+5,y],[xs[a]+5,y+18],'endArrow=block;endFill=1;',[[xs[a]+48,y],[xs[a]+48,y+18]]);d.text(`${i+1}. ${label}`,xs[a]+60,y-29,390,49,'fontSize=16;');}else{d.line([xs[a]+(a?5:0),y],[xs[b]+(b?(b>a?-5:5):0),y],`endArrow=${ret?'open':'block'};endFill=${ret?0:1};${ret?'dashed=1;':''}`);d.text(`${i+1}. ${label}`,Math.min(xs[a],xs[b])+12,y-44,Math.abs(xs[a]-xs[b])-24,41,'fontSize=16;align=center;');}});
 d.text('Primary API failure triggers frontend fallback GET /api/products/:slug/landing (ProductsController). Both use ProductsService. Fatal load errors show the error state; empty video/review lists render their empty states.',25,last+65,w-50,48,'fontSize=17;');
 d.text('Add-to-cart uses CartProvider.addItem; Buy now only opens checkout. Order/payment processing is outside FR-15. Video complete and CTA events use the same consent-gated analytics path; playback fetches media directly, not through ProductsController.',25,last+120,w-50,48,'fontSize=17;');
 d.text('Current gaps: stock polling calls /public/products/:id/stock but no matching route was found. Frontend featured sorting can override referral priority. Media allowlisting does not guarantee that a social watch-page URL can play in an HTML video element.',25,last+175,w-50,48,'fontSize=17;');
 return d.page('FR-15 | Product Landing and Video Review - Sequence',w,last+245,1);
}
D.save(path.join(__dirname,'FR15_Product_Landing_Video_Review_Class_Diagram.drawio'),[classes()]);
console.log('Created FR-15 class diagram.');
D.save(path.join(__dirname,'FR15_Product_Landing_Video_Review_Sequence_Diagram.drawio'),[sequence()]);
console.log('Created FR-15 single-page sequence diagram.');
