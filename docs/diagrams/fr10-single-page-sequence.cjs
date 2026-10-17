const D=require('./drawio-monochrome.cjs');

module.exports=function sequence(){
 const d=new D(),xs=[80,440,960,1500,2070,2690],w=2950;
 const m=[
 [0,1,'Open Create Affiliate Link dialog'],[1,2,'getEligibleProducts(page=1, limit=100)'],
 [2,3,'GET /api/collaborator/referral-links/products + JWT'],
 [3,4,'getEligibleProducts(current KOL id, query)'],
 [4,5,'Read KOL/KYC; eligible products + active Stores'],[5,4,'Product page / empty list',true],
 [4,3,'Eligible products + estimated commission',true],[3,2,'Product response',true],[2,1,'EligibleProduct[]',true],
 [1,1,'In parallel: campaign invitations via separate API'],[1,0,'Show product choices and eligible campaign options',true],
 [0,1,'Choose product; label; channel; optional campaign/UTM/expiry'],[1,1,'Validate form and local quota; prevent repeated submit'],
 [1,2,'createLink(payload)'],[2,3,'POST /api/collaborator/referral-links'],
 [3,4,'createReferralLink(user.id, dto, ip)'],
 [4,5,'Read KOL + CollaboratorProfile'],[5,4,'Account status, role and KYC',true],
 [4,5,'Read Product + Store'],[5,4,'Product and merchant eligibility',true],
 [4,4,'Require label/channel, KYC VERIFIED, approved affiliate product'],
 [4,5,'If campaign selected: check dates, participant, product scope'],[5,4,'Campaign eligibility / rejected request',true],
 [4,5,'Count links: last minute; ACTIVE total; product total'],[5,4,'Quota counts',true],
 [4,4,'Reject at 10/min, 500 ACTIVE, or 20/product/KOL'],
 [4,4,'Each attempt: random shortCode(8) + UUID; sanitize fields'],
 [4,5,'Transaction: create ACTIVE ReferralLink + internal QR URL'],
 [4,5,'Same transaction: AuditLog REFERRAL_LINK_CREATED'],
 [5,4,'Commit link; or rollback and propagate write error',true],
 [4,4,'On Prisma P2002: retry new code, at most 5 attempts'],
 [4,3,'Link + computed publicAppUrl/r/shortCode',true],
 [3,2,'201 Created',true],[2,1,'ReferralLinkItem',true],
 [1,1,'Keep success modal open; fetchLinks() refreshes list'],
 [1,0,'Show real shortUrl and Copy action',true],
 [0,1,'Click Copy'],[1,1,'navigator.clipboard.writeText(shortUrl)'],
 [1,0,'Show copied state / toast',true]
 ];
 const first=215,step=62,last=first+(m.length-1)*step;
 d.text('FR-10 | Create Short Affiliate Link - Sequence Diagram',25,14,w-50,44,'fontSize=29;fontStyle=1;');
 d.text('One page. JwtAuthGuard + RolesGuard (COLLABORATOR) and DTO validation apply before controller methods. Conditional calls are labelled.',25,67,w-50,37,'fontSize=17;');
 xs.forEach(x=>d.line([x,165],[x,last+45],'endArrow=none;dashed=1;'));
 d.box('KOL',64,110,32,40,'shape=umlActor;fillColor=#FFFFFF;strokeColor=#000000;verticalLabelPosition=bottom;verticalAlign=top;fontSize=16;');
 ['ReferralLinksPage','referralLinksService (web)','CollaboratorReferralLinksController','ReferralLinksService','Prisma / PostgreSQL'].forEach((n,i)=>d.box(n,xs[i+1]-225,110,450,55,'fillColor=#FFFFFF;strokeColor=#000000;align=center;whiteSpace=wrap;fontStyle=1;fontSize=18;'));
 for(const [s,e] of [[0,10],[11,35],[36,m.length-1]])for(let l=1;l<xs.length;l++){
  const inc=m.map((v,i)=>i>=s&&i<=e&&v[1]===l&&!v[3]?i:-1).filter(i=>i>=0);if(!inc.length)continue;
  const out=m.map((v,i)=>i>=inc[0]&&i<=e&&v[0]===l?i:-1).filter(i=>i>=0);
  d.box('',xs[l]-5,first+inc[0]*step,10,(Math.max(...inc,...out)-inc[0])*step+20,'fillColor=#FFFFFF;strokeColor=#000000;');
 }
 m.forEach(([a,b,label,ret],i)=>{const y=first+i*step;if(a===b){d.line([xs[a]+5,y],[xs[a]+5,y+18],'endArrow=block;endFill=1;',[[xs[a]+48,y],[xs[a]+48,y+18]]);d.text(`${i+1}. ${label}`,xs[a]+60,y-29,470,49,'fontSize=16;');}else{d.line([xs[a]+(a?5:0),y],[xs[b]+(b?(b>a?-5:5):0),y],`endArrow=${ret?'open':'block'};endFill=${ret?0:1};${ret?'dashed=1;':''}`);d.text(`${i+1}. ${label}`,Math.min(xs[a],xs[b])+12,y-44,Math.abs(xs[a]-xs[b])-24,41,'fontSize=16;align=center;');}});
 d.text('Campaign invitations: GET /api/campaigns/my-invitations, loaded alongside products. Backend campaign checks require matching Store, active dates, ACCEPTED participation and permitted product. Default link expiry is campaign end. Open Offer requires no approved Shop partnership.',25,last+65,w-50,52,'fontSize=17;');
 d.text('Backend also supports an approved Exclusive Deal (exclusiveDealId), mutually exclusive with campaignId; the ordinary create form does not send it. Quota counts happen before the transaction. P2002 retry is generic; after 5 failures return 409. Other errors stop the flow and keep the form.',25,last+125,w-50,52,'fontSize=17;');
 d.text('URL base: PUBLIC_APP_URL -> FRONTEND_URL -> localhost fallback. shortUrl is computed, not stored. Creating a link stores QR endpoint metadata; actual QR rendering, redirects, click tracking and cookie attribution are separate FR-11/13 interactions.',25,last+185,w-50,52,'fontSize=17;');
 return d.page('FR-10 | Create Short Affiliate Link - Sequence',w,last+260,1);
};
