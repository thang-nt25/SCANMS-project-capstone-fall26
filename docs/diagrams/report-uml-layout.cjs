const Uml=require('./fr09-uml-drawing.cjs');
const fs=require('fs'),path=require('path');
const overlaps=(a,b,pad=0)=>a.x<b.x+b.w+pad&&a.x+a.w>b.x-pad&&a.y<b.y+b.h+pad&&a.y+a.h>b.y-pad;

// Orthogonal routing through a visibility grid; class interiors and existing
// collinear routes are obstacles. Perpendicular crossings remain permitted.
function connect(d,relations,fixedRoutes=new Map()){
 const used=new Set(),occupied=[],labels=[],pendingLabels=[],pendingMultiplicities=[];
 const collision=(a,b)=>d.frames.some(r=>{
  const x=r.x-20,y=r.y-20,w=r.w+40,h=r.h+40;
  return a[0]===b[0]?a[0]>x&&a[0]<x+w&&Math.max(a[1],b[1])>y&&Math.min(a[1],b[1])<y+h:a[1]>y&&a[1]<y+h&&Math.max(a[0],b[0])>x&&Math.min(a[0],b[0])<x+w;
 });
 const overlap=(a,b,c,e)=>a[0]===b[0]&&c[0]===e[0]&&a[0]===c[0]&&Math.min(Math.max(a[1],b[1]),Math.max(c[1],e[1]))>Math.max(Math.min(a[1],b[1]),Math.min(c[1],e[1]))||a[1]===b[1]&&c[1]===e[1]&&a[1]===c[1]&&Math.min(Math.max(a[0],b[0]),Math.max(c[0],e[0]))>Math.max(Math.min(a[0],b[0]),Math.min(c[0],e[0]));
 const blocked=(a,b)=>occupied.some(([c,e])=>overlap(a,b,c,e)||
  a[0]===b[0]&&c[0]===e[0]&&Math.abs(a[0]-c[0])<18&&Math.min(Math.max(a[1],b[1]),Math.max(c[1],e[1]))>Math.max(Math.min(a[1],b[1]),Math.min(c[1],e[1]))||
  a[1]===b[1]&&c[1]===e[1]&&Math.abs(a[1]-c[1])<18&&Math.min(Math.max(a[0],b[0]),Math.max(c[0],e[0]))>Math.max(Math.min(a[0],b[0]),Math.min(c[0],e[0])));
 const ports=r=>['left','right','top','bottom'].flatMap(side=>[.125,.25,.375,.5,.625,.75,.875].map(t=>{
  const p=side==='left'?[r.x,r.y+r.h*t]:side==='right'?[r.x+r.w,r.y+r.h*t]:side==='top'?[r.x+r.w*t,r.y]:[r.x+r.w*t,r.y+r.h];
  const q=[p[0]+(side==='left'?-40:side==='right'?(r.x===1930?80:40):0),p[1]+(side==='top'?-40:side==='bottom'?40:0)];
  return {p,q,side,key:r.id+':'+side+':'+t};
 })).filter(p=>!used.has(p.key)&&!blocked(p.p,p.q));
 function route(a,b,kind){
  const minimumX=kind==='association'&&a.x===1930&&b.x===1930?1730:0;
  const modelDependency=kind==='dependency'&&a.id==='PrismaService'&&b.x===1930;
  const rightModels=kind==='association'&&a.x===1930&&b.x===1930;
  const starts=ports(a).filter(p=>p.q[0]>=minimumX&&(!modelDependency||p.side==='right')&&(!rightModels||p.side!=='left'));
  const ends=ports(b).filter(p=>p.q[0]>=minimumX&&(!modelDependency||p.side==='left')&&(!rightModels||p.side!=='left'));
  const all=d.frames.flatMap(r=>ports({...r,id:r.id+'grid'}));
  const modelChannels=Array.from({length:7},(_,i)=>1720+i*28);
  const xs=[...new Set([25,d.width-25,2630,2660,2690,2720,2750,...modelChannels,...all.map(p=>p.q[0]),...starts.map(p=>p.q[0]),...ends.map(p=>p.q[0])])].filter(x=>x>=minimumX&&x<=d.width-25).sort((a,b)=>a-b);
  const ys=[...new Set([100,...all.map(p=>p.q[1]),...starts.map(p=>p.q[1]),...ends.map(p=>p.q[1]),Math.max(...d.frames.map(r=>r.y+r.h))+80])].sort((a,b)=>a-b);
  const points=xs.flatMap(x=>ys.map(y=>[x,y])),ny=ys.length;
  const idx=p=>xs.indexOf(p[0])*ny+ys.indexOf(p[1]);
  const endMap=new Map(ends.map(e=>[idx(e.q),e]));
  const dist=new Map(),prev=new Map(),heap=[];
  const push=v=>{let i=heap.length;heap.push(v);while(i){const p=(i-1)>>1;if(heap[p][0]<=v[0])break;heap[i]=heap[p];i=p;}heap[i]=v;};
  const pop=()=>{const out=heap[0],v=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1][0]<heap[c][0])c++;if(heap[c][0]>=v[0])break;heap[i]=heap[c];i=c;}heap[i]=v;}return out;};
  for(const s of starts){const dir=s.p[0]===s.q[0]?1:0,key=idx(s.q)*2+dir;dist.set(key,40);prev.set(key,{start:s});push([40,key]);}
  let found;
  while(heap.length){
   const [cost,key]=pop();if(cost!==dist.get(key))continue;
   const id=Math.floor(key/2),dir=key%2,p=points[id];
   if(endMap.has(id)){found={key,end:endMap.get(id)};break;}
   const xi=Math.floor(id/ny),yi=id%ny;
   for(const [nx,nd] of [[xi>0?id-ny:-1,0],[xi+1<xs.length?id+ny:-1,0],[yi>0?id-1:-1,1],[yi+1<ny?id+1:-1,1]]){
    if(nx<0)continue;const q=points[nx];if(collision(p,q)||blocked(p,q))continue;
    const crossings=occupied.filter(([c,e])=>p[0]===q[0]?c[1]===e[1]&&p[0]>Math.min(c[0],e[0])&&p[0]<Math.max(c[0],e[0])&&c[1]>Math.min(p[1],q[1])&&c[1]<Math.max(p[1],q[1]):c[0]===e[0]&&p[1]>Math.min(c[1],e[1])&&p[1]<Math.max(c[1],e[1])&&c[0]>Math.min(p[0],q[0])&&c[0]<Math.max(p[0],q[0])).length;
    const next=nx*2+nd,total=cost+Math.abs(p[0]-q[0])+Math.abs(p[1]-q[1])+(dir!==nd?70:0)+crossings*100;
    if(total<(dist.get(next)??Infinity)){dist.set(next,total);prev.set(next,{key});push([total,next]);}
   }
  }
  if(!found)throw Error('No route '+a.id+' -> '+b.id);
  const reversed=[];let key=found.key;
  while(!prev.get(key).start){reversed.push(points[Math.floor(key/2)]);key=prev.get(key).key;}
  const start=prev.get(key).start;
  let pts=[start.p,start.q,...reversed.reverse(),found.end.p];
  pts=pts.filter((p,i)=>!i||p[0]!==pts[i-1][0]||p[1]!==pts[i-1][1]);
  let i=1;while(i<pts.length-1){if(pts[i-1][0]===pts[i][0]&&pts[i][0]===pts[i+1][0]||pts[i-1][1]===pts[i][1]&&pts[i][1]===pts[i+1][1])pts.splice(i,1);else i++;}
  used.add(start.key);used.add(found.end.key);for(let j=1;j<pts.length;j++)occupied.push([pts[j-1],pts[j]]);
  return {pts,start,end:found.end};
 }
 const crosses=(b,pts)=>pts.slice(1).some((q,i)=>{const p=pts[i];return p[0]===q[0]?p[0]>b.x-3&&p[0]<b.x+b.w+3&&Math.max(p[1],q[1])>b.y-3&&Math.min(p[1],q[1])<b.y+b.h+3:p[1]>b.y-3&&p[1]<b.y+b.h+3&&Math.max(p[0],q[0])>b.x-3&&Math.min(p[0],q[0])<b.x+b.w+3;});
 const boxOK=(b,edgeId)=>b.x>=0&&b.y>=85&&b.x+b.w<=d.width&&b.y+b.h<=d.height&&!d.frames.some(r=>overlaps(b,r,3))&&!labels.some(r=>overlaps(b,r,4))&&!d.connectors.some(c=>c.id!==edgeId&&crosses(b,c.points));
 function multiplicity(id,p,side,value){
  const w=value==='1'?24:50;
  const x=side==='left'?p[0]-10-w:side==='right'?p[0]+10:p[0]+12;
  const y=side==='top'?p[1]-34:side==='bottom'?p[1]+8:p[1]+8;
  let b;
  const candidates=side==='left'||side==='right'
   ?[8,-36,40,-68,72,-100,104].flatMap(dy=>[10,36,66,96].map(gap=>({x:side==='left'?p[0]-gap-w:p[0]+gap,y:p[1]+dy})))
   :[side==='top'?-34:8,side==='top'?-66:40,side==='top'?-98:72].flatMap(dy=>[12,-12-w,36,-36-w,66,-66-w].map(dx=>({x:p[0]+dx,y:p[1]+dy})));
  for(const candidate of candidates){const box={...candidate,w,h:28};if(boxOK(box,id.replace(/_(source|target)_mult$/,''))&&!d.connectors.some(c=>crosses(box,c.points))){b=box;break;}}
  if(!b)throw Error('No multiplicity space '+id);
  d.text(id,value,b.x,b.y,w,28,18);labels.push(b);
 }
 const order=relations.map((_,i)=>i).sort((a,b)=>Number(!fixedRoutes.has(relations[a][0]+'|'+relations[a][1]))-Number(!fixedRoutes.has(relations[b][0]+'|'+relations[b][1])));
 for(const i of order){
  const [aid,bid,kind,label,sm,tm]=relations[i],a=d.frames.find(r=>r.id===aid),b=d.frames.find(r=>r.id===bid);
  const fixed=fixedRoutes.get(aid+'|'+bid);
  let result;
  if(fixed){
   const side=(r,p)=>p[1]===r.y?'top':p[1]===r.y+r.h?'bottom':p[0]===r.x?'left':'right';
   const start={p:fixed[0],side:side(a,fixed[0])},end={p:fixed.at(-1),side:side(b,fixed.at(-1))};
   for(const [r,p] of [[a,start],[b,end]])used.add(r.id+':'+p.side+':0.5');
   for(let j=1;j<fixed.length;j++){if(blocked(fixed[j-1],fixed[j]))throw Error('Overlapping fixed route '+aid+' -> '+bid);occupied.push([fixed[j-1],fixed[j]]);}
   result={pts:fixed,start,end};
  }else result=route(a,b,kind);
  const {pts,start,end}=result,id='relation_'+i;
  d.relation(id,a,b,pts,kind,'');
  if(sm!==undefined){pendingMultiplicities.push([id+'_source_mult',start.p,start.side,sm],[id+'_target_mult',end.p,end.side,tm]);}
  if(label)pendingLabels.push({id,label,pts,aid,bid});
 }
 // Finish routing before placing text, so later wires cannot cross or be hidden
 // by a multiplicity. Place captions after multiplicities to keep endpoints clear.
 for(const args of pendingMultiplicities)multiplicity(...args);
 for(const {id,label,pts,aid,bid} of pendingLabels){
   const captionW=Math.max(70,Math.ceil(label.length*10.5+18)),captionH=30;
   const segments=pts.slice(1).map((q,j)=>({p:pts[j],q,len:Math.abs(q[0]-pts[j][0])+Math.abs(q[1]-pts[j][1])})).sort((a,b)=>b.len-a.len);
   let chosen;
   for(const [si,s] of segments.entries()){for(const t of [.5,.4,.6,.3,.7,.2,.8,.1,.9,.05,.15,.25,.35,.45,.55,.65,.75,.85,.95]){
    const x=s.p[0]+(s.q[0]-s.p[0])*t,y=s.p[1]+(s.q[1]-s.p[1])*t;
    for(const [dx,dy] of s.p[1]===s.q[1]?[[0,-28],[0,28],[0,0],[0,-60],[0,60],[0,-90],[0,90]]:[[0,0],[captionW/2+10,0],[-captionW/2-10,0],[0,-60],[0,60]]){
     const box={x:x+dx-captionW/2,y:y+dy-captionH/2,w:captionW,h:captionH};
     const offsetCost=s.p[1]===s.q[1]?(dy===-28?0:dy===28?8:dy===0?16:Math.abs(dy)):(dx===captionW/2+10?0:dx===-captionW/2-10?8:dx===0&&dy===0?16:Math.abs(dx)+Math.abs(dy));
     const score=offsetCost+Math.abs(t-.5)*40+si*8;
     if(boxOK(box,id)&&!crosses(box,pts)&&(!chosen||score<chosen.score))chosen={...box,score};
    }
   }}
   if(!chosen)throw Error('No label space '+aid+' -> '+bid+' '+label+' '+JSON.stringify({pts,labels}));
   d.text(id+'_label',label,chosen.x,chosen.y,chosen.w,chosen.h,18,'center');labels.push(chosen);
 }
 d.validateRouting();
}

function classes(spec){
 const layout=spec.classLayout;if(!layout)throw Error('Missing FR9 class layout for '+spec.fr);
 // Reserve a narrow right gutter for the additional model associations; box
 // widths and the three column origins are the original FR9 values.
 const d=new Uml(2800,2400),positions=new Map();
 d.text('title',spec.title+' — Class Diagram',50,24,2540,48,30,'left',true);
 const add=(id,x,y,w)=>{
  const c=spec.classes.find(c=>c.id===id);if(!c)throw Error('Missing class '+id);
  // Same type size and box widths as FR9. Long signatures get taller rows,
  // rather than widening every model to the width of a method declaration.
  const row=(value,base)=>value.length>Math.floor((w-24)/8.8)?52:base;
  const f=d.cls(c.id,c.name,c.attrs,c.ops,x,y,w,{attrHeights:c.attrs.map(v=>row(v,27)),opHeights:c.ops.map(v=>row(v,29))});positions.set(id,f);return f;
 };
 const controller=add(layout.controller,850,150,830);
 const service=add(layout.service,850,700,830);
 const prisma=add('PrismaService',850,1280,830);
 for(const [id,y] of layout.supports)add(id,60,y,560);
 const client=add('PrismaClient',60,1700,650);
 for(const id of layout.models){
  const placement=layout.modelPositions?.[id];
  if(!placement)throw Error('Missing model placement '+spec.fr+' '+id);
  add(id,...placement);
 }
 if(positions.size!==spec.classes.length)throw Error('Unpositioned or repeated classes for '+spec.fr);
 const last=Math.max(...d.frames.map(r=>r.y+r.h));d.height=Math.max(2240,last+(layout.version==='fr09-model-columns-v4'?220:180));
 const middle=r=>r.x+r.w/2;
 const fixed=new Map([
  [controller.id+'|'+service.id,[[middle(controller),controller.y+controller.h],[middle(service),service.y]]],
  [service.id+'|PrismaService',[[middle(service),service.y+service.h],[middle(prisma),prisma.y]]],
  ['PrismaService|PrismaClient',[[middle(prisma),prisma.y+prisma.h],[middle(prisma),1620],[middle(client),1620],[middle(client),client.y]]]
 ]);
 // A second controller/service pair (FR13) follows the same vertical order in
 // the supporting column. Its database reference joins the central PrismaService.
 for(const [aid,bid,kind] of spec.relations){const a=positions.get(aid),b=positions.get(bid);if(kind==='reference'&&a.x===60&&b.x===60&&/Controller$/.test(aid)&&/Service$/.test(bid))fixed.set(aid+'|'+bid,[[middle(a),a.y+a.h],[middle(b),b.y]]);}
 connect(d,spec.relations,fixed);
 d.text('legend1','+ public member     - private member     Solid arrow: retained reference     Dashed arrow: dependency',60,d.height-175,2500,32,19);
 d.text('legend2','Hollow triangle: actual inheritance (PrismaService extends PrismaClient)     Solid line with multiplicities: model association',60,d.height-135,2500,32,19);
 d.text('scope',spec.classNote,60,d.height-90,2500,60,18);
 return d;
}

function sequence(spec){
 // FR9 presentation preset: actor -> Browser -> real application participants.
 // Additional actors shift the same chain right; they do not change its spacing.
 if(spec.sequenceLayout?.reference!=='FR09')throw Error('Missing FR9 sequence layout for '+spec.fr);
 const actorCount=spec.lanes.filter(l=>l.actor).length;
 const widths=spec.lanes.map(l=>l.actor?220:l.name==='Browser'?250:430);
 const order=spec.sequenceLayout.order||spec.lanes.map(l=>l.id);
 if(order.length!==spec.lanes.length||new Set(order).size!==order.length||order.some(id=>!spec.lanes.some(l=>l.id===id)))throw Error('Invalid sequence column order '+spec.fr);
 let actorIndex=0,participantIndex=0;
 const coordinates=new Map(order.map(id=>{
  const l=spec.lanes.find(l=>l.id===id);
  if(l.actor)return [id,110+actorIndex++*290];
  const i=participantIndex++;
  return [id,460+(actorCount-1)*290+(i===0?0:570+(i-1)*540)];
 }));
 const xs=spec.lanes.map(l=>coordinates.get(l.id));
 const width=Math.max(2840,...spec.lanes.map((l,i)=>xs[i]+Math.max(widths[i]/2+45,spec.messages.some(m=>m[0]===l.id&&m[0]===m[1])?510:0)));
 const first=245,step=64,ys=[first];
 // FR9 places self-call text beside the loop. Reserve 16 extra pixels after
 // that row to keep its two-line caption separate from the following message.
 for(let i=1;i<spec.messages.length;i++)ys.push(ys.at(-1)+step+(spec.messages[i-1][0]===spec.messages[i-1][1]?16:0));
 // Match FR9's interaction area (245..2485). Fewer messages get more room
 // between rows, rather than leaving a long empty tail below the last reply.
 const naturalSpan=ys.at(-1)-first,stretch=Math.max(1,2240/Math.max(1,naturalSpan));
 for(let i=1;i<ys.length;i++)ys[i]=Math.round(first+(ys[i]-first)*stretch);
 const last=ys.at(-1);
 const footerHeight=Math.max(240,spec.notes.length*55+35);
 const height=Math.max(2835,last+footerHeight+110);
 const d=new Uml(width,height);const index=Object.fromEntries(spec.lanes.map((l,i)=>[l.id,i]));
 const spans=[...(spec.activations||[])];
 // Like FR9, Browser remains active across the interaction unless the spec
 // already describes separate interactions (for example, video then checkout).
 const browser=spec.lanes.find(l=>l.name==='Browser');
 if(browser&&!spans.some(([id])=>id===browser.id)){
  const events=spec.messages.flatMap((m,i)=>m[0]===browser.id||m[1]===browser.id?[i]:[]);
  if(events.length)spans.push([browser.id,events[0],events.at(-1)]);
 }
 d.text('title',spec.title+' — Sequence Diagram',45,20,width-90,46,28,'left',true);
 d.text('subtitle',spec.subtitle,45,73,width-90,32,20);
 spec.lanes.forEach((l,i)=>{
  if(l.actor)d.actor('actor_'+l.id,l.name,xs[i],120);
  else {d.rect('head_'+i,xs[i]-widths[i]/2,135,widths[i],58);d.text('head_text_'+i,l.name,xs[i]-widths[i]/2+8,143,widths[i]-16,42,20,'center',true);}
  d.line('lifeline_'+i,[[xs[i],193],[xs[i],height-footerHeight-40]],{dash:true});
 });
 const active=new Map();let ai=0;
 const activation=(i,a,b,nested=0)=>d.rect('activation_'+ai++,xs[i]-5+nested*6,ys[a],10,ys[b]-ys[a]+(spec.messages[b][0]===spec.messages[b][1]?29:10));
 const shift=(lane,i)=>Math.max(0,...spans.filter(([id,start,end])=>index[id]===lane&&i>=start&&i<=end).map(s=>(s[3]||0)*6));
 // As in FR9, actors have an execution bar for the interaction they initiate.
 spec.lanes.forEach((l,i)=>{if(l.actor){const events=spec.messages.flatMap((m,j)=>m[0]===l.id||m[1]===l.id?[j]:[]);if(events.length)activation(i,events[0],events.at(-1));}});
 spec.messages.forEach(([from,to,label,mode],i)=>{
  const a=index[from],b=index[to];
  if(a===undefined||b===undefined)throw Error('Missing lane '+from+' '+to);
  const coveredA=spans.some(([id,start,end])=>index[id]===a&&i>=start&&i<=end);
  const coveredB=spans.some(([id,start,end])=>index[id]===b&&i>=start&&i<=end);
  if(a!==b&&mode!=='return'&&!spec.lanes[b].actor&&!coveredB){
   if(mode==='async')activation(b,i,i);
   else {const stack=active.get(b)||[];stack.push(i);active.set(b,stack);}
  } else if(mode==='return'&&!spec.lanes[a].actor&&!coveredA){const stack=active.get(a)||[];if(stack.length)activation(a,stack.pop(),i,stack.length);}
 });
 for(const [i,stack] of active)while(stack.length)activation(i,stack.pop(),spec.messages.length-1,stack.length);
 for(const [id,start,end,nested] of spans)activation(index[id],start,end,nested);
 spec.messages.forEach(([from,to,label,mode],i)=>{
  const a=index[from],b=index[to],yy=ys[i],n=i+1;
  const ax=xs[a]+shift(a,i),bx=xs[b]+shift(b,i);
  if(a===b){d.line('message_'+n,[[ax+5,yy],[ax+50,yy],[ax+50,yy+19],[ax+5,yy+19]],{arrow:'filled'});d.text('message_text_'+n,n+'. '+label,ax+62,yy-26,430,46,18);}
  else {
   const right=xs[b]>xs[a];d.line('message_'+n,[[ax+(right?5:-5),yy],[bx+(right?-5:5),yy]],{arrow:mode==='return'||mode==='async'?'open':'filled',dash:mode==='return'});
   // FR9 uses transparent message captions. Keep a long-arrow caption inside
   // one clear column gap so an intermediate lifeline cannot run through text.
   const left=Math.min(xs[a],xs[b]),rightX=Math.max(xs[a],xs[b]),mid=(left+rightX)/2;
   const columns=xs.filter(x=>x>=left&&x<=rightX).sort((x,y)=>x-y);
   const gaps=columns.slice(1).map((x,i)=>({left:columns[i],right:x}));
   gaps.sort((x,y)=>Math.abs((x.left+x.right)/2-mid)-Math.abs((y.left+y.right)/2-mid));
   const gap=gaps[0];
   d.text('message_text_'+n,n+'. '+label,gap.left+12,yy-49,gap.right-gap.left-24,44,18,'center');
  }
 });
 spec.notes.forEach((v,i)=>d.text('note_'+i,v,45,height-footerHeight+(i?50+(i-1)*55:0),width-90,44,19));
 return d;
}

function build(spec,dir=__dirname,kinds=['Class','Sequence']){
 const results={};for(const [kind,fn] of [['Class',classes],['Sequence',sequence]].filter(([kind])=>kinds.includes(kind))){
  const d=fn(spec),file=path.join(dir,spec.stem+'_'+kind+'_Diagram.drawio');
  const model=d.save(file,spec.title+' - '+kind+' Diagram',spec.fr);
  fs.writeFileSync(path.join(dir,spec.fr+'_'+kind+'_Paste.xml'),model);
  fs.copyFileSync(file,path.join(dir,'..','review 2',spec.fr+' - '+kind+' Diagram'));
  results[kind]={width:d.width,height:d.height};
 }
 return {fr:spec.fr,classes:spec.classes.length,messages:spec.messages.length,...results};
}
module.exports={build,classes,sequence};
