const fs=require('fs'),path=require('path'),D=require('./drawio-monochrome.cjs');
const base='FR07_Product_Catalog_Soft_Delete';
function classes(){
 const d=new D(),w=3200;
 d.text('FR-07 | Product Catalog, Inventory and Soft Delete - Class Diagram',35,20,w-70,45,'fontSize=29;fontStyle=1;');
 d.text('Current code: Shop-owned CRUD; SKU variants and evidence; moderation gates; customCommissionRate fixed at 10%; Product rows are soft-deleted.',35,78,w-70,38,'fontSize=18;');
 const ui=d.cls('<<React function>> ProductManagementPage',[
  'products: Product[]; search; filterStatus','editingProduct; deleteConfirmProduct; showModal','form fields; formVariants; variantSamplePolicies','savingProduct; saveError; currentStoreId'
 ],['loadProducts(); openEditModal(product)','handleSave(event); closeProductModal()','Delete confirmation -> softDeleteProduct(id)'],35,170,630);
 const web=d.cls('<<web object>> productService',[],[
  'getProducts(query, fresh=false); getProduct(id)','createProduct(data); updateProduct(id, data)','syncProductVariants(id, variants)','updateVariantSamplePolicy(productId, variantId, dto)','softDeleteProduct(id); bulkUpdateCommission(ids, rate)'
 ],850,170,550);
 const ctl=d.cls('<<NestJS controller>> ProductsController',['- productsService: ProductsService'],[
  'findAll(query, user); findOne(id, userId, role)','create(ownerId, role, dto)','update(ownerId, role, id, dto)','syncVariants(ownerId, role, productId, dto)','softDelete(ownerId, role, id)','bulkCommission(ownerId, role, ids, rate)'
 ],1600,170,600);
 const dto=d.cls('<<DTOs>> Product write inputs',[
  'CreateProductDto: required content, price, stock','variants: ProductVariantInputDto[] [1..100 on create]','UpdateProductDto: optional product fields','customCommissionRate?: number [Min=Max=10]','SyncProductVariantsDto.variants: array [max 100]','Variant input: id?, sku, name, attributes?, imageUrl?','Variant input: price?, stockQuantity [integer >= 0]'
 ],[],2440,170,700);
 const query=d.cls('<<DTO>> QueryProductsDto',[
  'search?; category?; storeId?: string','page = 1; limit = 20 [converted to Number]'
 ],['Service clamps page >= 1 and limit to 1..100'],35,760,630);
 const db=d.cls('<<infrastructure>> PrismaService',[],[
  'product: findMany / count / create / update','store.findFirst(...); mediaAsset CRUD','productVariant CRUD / updateMany','$transaction(callback) [create and variant sync]'
 ],850,760,550);
 const svc=d.cls('<<NestJS service>> ProductsService',[
  '- prisma: PrismaService; - cacheService: CacheService','- configService: ConfigService [other flows]'
 ],['findAll(query, viewer?); findOne(id, viewer?)','create(userId, role, dto); update(userId, role, id, dto)','syncProductVariants(userId, role, productId, dto)','softDelete(userId, role, id)','bulkUpdateCommission(userId, role, ids, rate)','invalidateLandingCache(productId?)','- assertProductSubmissionComplete(dto)','- buildProductEvidenceRows(...); loadProductEvidence(...)'],1600,760,600);
 const cache=d.cls('<<infrastructure>> CacheService',[],[
  'delPrefix(landing:v2:productId:)','Called after update / variant sync / soft delete'
 ],2440,760,700);
 d.edge(ui,web,[665,300],[850,300],['uses',675,265,160]);
 d.edge(web,ctl,[1400,300],[1600,300],['HTTP + JWT',1410,265,180]);
 d.edge(ctl,dto,[2200,300],[2440,300],['validates body',2220,265,200]);
 d.edge(ctl,svc,[1900,ctl.y+ctl.h],[1900,760],['delegates',1920,635,180]);
 d.edge(svc,db,[1600,860],[1400,860],['queries / writes',1410,825,180]);
 d.edge(svc,cache,[2200,850],[2440,850],['invalidate',2240,815,160]);
 d.edge(svc,query,[1600,1000],[665,850],['list query',840,685,160],[[1500,1000],[1500,700],[730,700],[730,850]]);
 d.text('AUTH: JWT + RolesGuard. Writes: SHOP_MANAGER / SYSTEM_MANAGER / SYSTEM_ADMIN. Shop writes check ownership; create/update/SKU sync also require verified onboarding.',35,1205,w-70,45,'fontSize=18;');
 d.text('DOMAIN MODEL | selected fields; solid lines are Prisma associations. No Category entity: categoryName is a nullable string.',35,1280,w-70,42,'fontSize=24;fontStyle=1;');
 const store=d.cls('Store',[
  'id: UUID [PK]; ownerId: UUID [FK -> User]','name; isDeleted; isVerified; onboardingStatus'
 ],[],35,1380,630);
 const prod=d.cls('Product',[
  'id: UUID [PK]; storeId: UUID [FK]','sku; title; categoryName?: string','price; originalPrice?: Decimal(15,2)','customCommissionRate?: Decimal(5,2) = 10','stockQuantity: Int; isAffiliateEnabled: boolean','moderationStatus: DRAFT | APPROVED | REJECTED','isActive: boolean; isDeleted: boolean','deletedAt?: DateTime; sampleQuota / sampleGrantedCount','ingredients?; origin?; labelInfo?; imageUrl?'
 ],[],850,1380,550);
 const variant=d.cls('ProductVariant',[
  'id: UUID [PK]; productId: UUID [FK]','sku: string [globally unique]; name: string','attributes: Json; imageUrl?: string; price?: Decimal','stockQuantity: Int; isActive: boolean','sampleEnabled?: boolean; sampleQuota?: Int','sampleGrantedCount: Int [no isDeleted column]'
 ],[],1600,1380,600);
 const media=d.cls('MediaAsset',[
  'id: UUID [PK]; productId?: UUID [FK]','storeId: UUID [FK]; assetType; status','urlOrContent: string; caption?: string','isDeleted: boolean; deletedAt?: DateTime','Evidence uses COPYWRITE_TEXT + marker caption','Sub-images use IMAGE [up to 4 saved]'
 ],[],2440,1380,700);
 const item=d.cls('OrderItem',[
  'id: UUID [PK]; orderId: UUID [FK]','productId: UUID [FK]; variantId?: UUID [FK]','quantity: Int; unitPrice: Decimal','appliedCommissionRate: Decimal','calculatedCommissionAmount: Decimal','commissionSnapshotAt?: DateTime'
 ],[],850,1910,550);
 d.edge(store,prod,[665,1460],[850,1460],['1          0..*',675,1425,160],[],false);
 d.edge(prod,variant,[1400,1490],[1600,1490],['1          0..*',1410,1455,180],[],false);
 d.edge(prod,item,[1125,prod.y+prod.h],[1125,1910],['1     /     0..*',1140,1810,180],[],false);
 d.edge(prod,media,[1400,1630],[2790,media.y+media.h],null,[[1490,1630],[1490,1780],[2790,1780]],false);
 d.text('0..1 Product per asset; 0..* assets per Product',1900,1745,610,28,'fontSize=16;');
 d.text('Soft delete updates Product.isDeleted=true, deletedAt=now, isActive=false. It keeps Product, variants, media and OrderItem rows; no product DELETE is issued.',35,2260,w-70,48,'fontSize=18;');
 d.text('Create: transaction saves Product + nested variants + evidence + sub-images; status DRAFT, inactive, commission 10. Product stock is the sum of supplied variant quantities.',35,2320,w-70,48,'fontSize=18;');
 d.text('Edit: product update, variant sync and optional sample-policy requests are separate saves. Content changes may require review; stock-only changes do not by themselves trigger review.',35,2380,w-70,48,'fontSize=18;');
 d.text('Variant sync uses a transaction and sums saved SKU stock when non-empty. Its deactivation query excludes submitted existing IDs; newly created IDs are not added to that exclusion [see analysis].',35,2440,w-70,48,'fontSize=18;');
 return d.page('FR-07 | Product Catalog and Soft Delete - Classes',w,2520);
}
function sequence(){
 const d=new D(),xs=[80,450,990,1540,2110,2740,3330],w=3620;
 const phases=[
 [
  [0,1,'Open product management / search catalog'],
  [1,2,'loadProducts(): getProducts(search, currentStoreId)'],
  [2,3,'Cache miss: GET /api/products + query + JWT'],
  [3,4,'findAll(query, { id: userId, role })'],
  [4,5,'count + findMany: not deleted, owned Store; attach evidence'],
  [5,4,'items with active variants + pagination',true],
  [4,3,'Filtered catalog',true],
  [3,2,'200 OK: catalog payload',true],
  [2,1,'res.data -> items; page uses returned items',true],
  [1,0,'Display products; choose Create',true]
 ],[
  [0,1,'Enter content, evidence, variants and stock; Save'],
  [1,1,'Validate required fields, proof URLs, SKU options, quantities'],
  [1,2,'createProduct(payload; commission=10; variants included)'],
  [2,3,'POST /api/products + JWT + CreateProductDto'],
  [3,4,'create(userId, role, dto)'],
  [4,5,'Find owned Store; check existing Product / variant SKUs'],
  [5,4,'Store verification + duplicate query results',true],
  [4,4,'Require verified Shop, complete evidence, valid SKU options'],
  [4,5,'Transaction: Product DRAFT/inactive + variants + media'],
  [5,4,'Commit Product; stock=sum(variant.stockQuantity)',true],
  [4,3,'{ message, product }; commission=10',true],
  [3,2,'201 Created',true],
  [2,1,'Create result; shared api invalidates /products cache',true],
  [1,0,'Close modal; reload catalog; pending-review product shown',true]
 ],[
  [0,1,'Edit an existing product / change SKU stock; Save'],
  [1,2,'updateProduct(id, fields; commission=10)'],
  [2,3,'PUT /api/products/:id + UpdateProductDto'],
  [3,4,'update(userId, role, id, dto)'],
  [4,5,'Read Product + Store + images + evidence'],
  [5,4,'Existing product and ownership / verification data',true],
  [4,4,'Validate; determine content re-review; guard sample quota'],
  [4,5,'Update fields; if review needed: DRAFT and inactive; save media'],
  [5,4,'Product and optional media writes completed',true],
  [4,6,'invalidateLandingCache(id): delPrefix(landing:v2:id:)'],
  [4,3,'{ product, requiresModeration, message }',true],
  [3,2,'200 OK: product update result',true],
  [2,1,'Product saved; invalidate client product cache',true],
  [1,2,'Then syncProductVariants(id, formVariants)'],
  [2,3,'PUT /api/products/:id/variants'],
  [3,4,'syncProductVariants(userId, role, id, dto)'],
  [4,5,'Read product/variants; check ownership, SKU conflicts'],
  [5,4,'Current variants + validation query results',true],
  [4,5,'Transaction: upsert SKU rows; deactivate query; sum stock'],
  [5,4,'Commit saved variants; content changes may reset review',true],
  [4,6,'invalidateLandingCache(id)'],
  [4,3,'{ variants, requiresModeration, message }',true],
  [3,2,'200 OK: variant sync result',true],
  [2,1,'Variant save result; invalidate client product cache',true],
  [1,1,'If configured: PATCH sample-policy per retained variant'],
  [1,0,'Close modal; reload catalog; show save / review message',true]
 ],[
  [0,1,'Choose Delete and confirm'],
  [1,2,'softDeleteProduct(id); close confirmation'],
  [2,3,'DELETE /api/products/:id + JWT'],
  [3,4,'softDelete(userId, role, id)'],
  [4,5,'product.findUnique(id, include Store)'],
  [5,4,'Product / missing / already deleted',true],
  [4,4,'Require existing product and owned Store (system bypass)'],
  [4,5,'product.update: isDeleted=true, deletedAt=now, isActive=false'],
  [5,4,'Soft-delete flag persisted; history rows retained',true],
  [4,6,'invalidateLandingCache(id)'],
  [4,3,'Success message; no physical product deletion',true],
  [3,2,'200 OK; shared api invalidates /products cache',true],
  [2,1,'Delete completed -> loadProducts()',true],
  [1,0,'Product excluded from refreshed non-deleted catalog',true]
 ]
 ];
 const m=phases.flat(),first=215,step=62,last=first+(m.length-1)*step;
 d.text('FR-07 | Product Catalog: Read, Create, Update Inventory and Soft Delete',25,14,w-50,44,'fontSize=29;fontStyle=1;');
 d.text('One page. Shop Manager flow. JWT + role guards and DTO validation precede controller methods; conditional writes are labelled. Reload uses the first GET flow.',25,67,w-50,37,'fontSize=17;');
 xs.forEach(x=>d.line([x,165],[x,last+45],'endArrow=none;dashed=1;'));
 d.box('Shop Manager',64,110,32,40,'shape=umlActor;fillColor=#FFFFFF;strokeColor=#000000;verticalLabelPosition=bottom;verticalAlign=top;fontSize=16;');
 ['ProductManagementPage','productService / shared api (web)','ProductsController','ProductsService','Prisma / PostgreSQL','CacheService'].forEach((n,i)=>d.box(n,xs[i+1]-245,110,490,55,'fillColor=#FFFFFF;strokeColor=#000000;align=center;whiteSpace=wrap;fontStyle=1;fontSize=18;'));
 let start=0;for(const phase of phases){const end=start+phase.length-1;for(let l=1;l<xs.length;l++){
  const inc=m.map((v,i)=>i>=start&&i<=end&&v[1]===l&&!v[3]?i:-1).filter(i=>i>=0);if(!inc.length)continue;
  const out=m.map((v,i)=>i>=inc[0]&&i<=end&&v[0]===l?i:-1).filter(i=>i>=0);
  d.box('',xs[l]-5,first+inc[0]*step,10,(Math.max(...inc,...out)-inc[0])*step+20,'fillColor=#FFFFFF;strokeColor=#000000;');
 }start=end+1;}
 m.forEach(([a,b,label,ret],i)=>{const y=first+i*step;if(a===b){d.line([xs[a]+5,y],[xs[a]+5,y+18],'endArrow=block;endFill=1;',[[xs[a]+48,y],[xs[a]+48,y+18]]);d.text(`${i+1}. ${label}`,xs[a]+60,y-29,465,49,'fontSize=16;');}else{d.line([xs[a]+(a?5:0),y],[xs[b]+(b?(b>a?-5:5):0),y],`endArrow=${ret?'open':'block'};endFill=${ret?0:1};${ret?'dashed=1;':''}`);d.text(`${i+1}. ${label}`,Math.min(xs[a],xs[b])+12,y-44,Math.abs(xs[a]-xs[b])-24,41,'fontSize=16;align=center;');}});
 d.text('Writes allow SHOP_MANAGER, SYSTEM_MANAGER, SYSTEM_ADMIN. Shop create/update/variant sync require a verified Store. Delete checks ownership but does not add that verification gate. Errors: 400 validation, 403 forbidden, 404 missing/deleted, 409 duplicate SKU.',25,last+65,w-50,48,'fontSize=17;');
 d.text('New products are DRAFT and inactive. Approved Shop content/price/image/evidence or variant-content changes can require review; stock-only changes alone do not. UI custom commission is always 10; bulk API also accepts only 10.',25,last+120,w-50,48,'fontSize=17;');
 d.text('Create and SKU sync each have their own transaction. Product edit/media replacement, SKU sync and sample-policy calls are separate writes; a later failure does not undo an earlier successful request. UI retains save errors and clears saving in finally.',25,last+175,w-50,48,'fontSize=17;');
 d.text('Variant sync deactivation excludes submitted existing IDs, not newly created IDs. This can deactivate new rows in that sync transaction; returned rows and stock sum may then differ from active rows. See analysis; diagrams do not silently repair code.',25,last+230,w-50,48,'fontSize=17;');
 d.text('Soft delete keeps Product/variants/media/order history. Backend list filters isDeleted=false. Client GET may use cache; writes invalidate /products client cache. Create does not explicitly invalidate landing cache; update, sync and delete do.',25,last+285,w-50,48,'fontSize=17;');
 return d.page('FR-07 | Product CRUD Inventory Soft Delete - Sequence',w,last+360,1);
}
D.save(path.join(__dirname,`${base}_Class_Diagram.drawio`),[classes()]);
D.save(path.join(__dirname,`${base}_Sequence_Diagram.drawio`),[sequence()]);
for(const kind of ['Class','Sequence']){const xml=fs.readFileSync(path.join(__dirname,`${base}_${kind}_Diagram.drawio`),'utf8');fs.writeFileSync(path.join(__dirname,`FR07_${kind}_Paste.xml`),xml.match(/<mxGraphModel\b[\s\S]*?<\/mxGraphModel>/)[0]);}
console.log('FR07 class, sequence and paste XML generated.');
