const fs = require('fs');
const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll('\n','&#xa;');
class UmlDrawing {
 constructor(width,height){this.width=width;this.height=height;this.cells=[];this.scene=[];this.frames=[];this.connectors=[];this.ids=new Set();}
 add(id,xml){if(this.ids.has(id))throw new Error(`Duplicate ID: ${id}`);this.ids.add(id);this.cells.push(xml);}
 rect(id,x,y,w,h,parent='1',origin=[0,0]){
  this.add(id,`<mxCell id="${id}" value="" style="rounded=0;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.4;" vertex="1" parent="${parent}"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`);
  this.scene.push({type:'rect',x:x+origin[0],y:y+origin[1],w,h});
 }
 text(id,value,x,y,w,h=30,size=18,align='left',bold=false,parent='1',origin=[0,0]){
  this.add(id,`<mxCell id="${id}" value="${esc(value)}" style="text;html=0;fontFamily=Arial;fontColor=#000000;fontSize=${size};fontStyle=${bold?1:0};align=${align};verticalAlign=middle;whiteSpace=wrap;fillColor=none;strokeColor=none;spacing=0;" vertex="1" connectable="0" parent="${parent}"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`);
  this.scene.push({type:'text',value,x:x+origin[0],y:y+origin[1],w,h,size,align,bold});
 }
 line(id,points,{dash=false,arrow='none',source,target,label='',labelAt,sourceAnchor,targetAnchor}={}){
  const p=points[0],q=points.at(-1),mid=this.pointOnPath(points,0.5);
  const terminal=source?` source="${source.id}" target="${target.id}"`:'';
  const anchors=source?`exitX=${sourceAnchor[0]};exitY=${sourceAnchor[1]};entryX=${targetAnchor[0]};entryY=${targetAnchor[1]};exitPerimeter=0;entryPerimeter=0;`:'';
  const end=arrow==='filled'||arrow==='triangle'?'block':arrow==='open'?'open':'none';
  const style=`rounded=0;html=0;strokeColor=#000000;strokeWidth=1.4;endArrow=${end};endFill=${arrow==='filled'?1:0};endSize=${arrow==='triangle'?16:10};dashed=${dash?1:0};dashPattern=6 4;fontFamily=Arial;fontSize=18;fontColor=#000000;labelBackgroundColor=#FFFFFF;${anchors}`;
  const offset=labelAt?`<mxPoint x="${labelAt[0]-mid[0]}" y="${labelAt[1]-mid[1]}" as="offset"/>`:'';
  this.add(id,`<mxCell id="${id}" value="${esc(label)}" style="${style}" edge="1" parent="1"${terminal}><mxGeometry relative="1" as="geometry"><mxPoint x="${p[0]}" y="${p[1]}" as="sourcePoint"/><mxPoint x="${q[0]}" y="${q[1]}" as="targetPoint"/>${points.length>2?'<Array as="points">'+points.slice(1,-1).map(t=>`<mxPoint x="${t[0]}" y="${t[1]}"/>`).join('')+'</Array>':''}${offset}</mxGeometry></mxCell>`);
  this.scene.push({type:'line',points,dash,arrow});
  if(label){const at=labelAt||mid;this.scene.push({type:'text',value:label,x:at[0]-145,y:at[1]-18,w:290,h:36,size:18,align:'center',background:true});}
 }
 pointOnPath(points,ratio){const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]));let rem=lengths.reduce((a,b)=>a+b,0)*ratio;for(let i=0;i<lengths.length;i++){if(rem<=lengths[i])return [points[i][0]+(points[i+1][0]-points[i][0])*rem/lengths[i],points[i][1]+(points[i+1][1]-points[i][1])*rem/lengths[i]];rem-=lengths[i];}return points.at(-1);}
 cls(id,name,attrs,ops,x,y,w,options={}){
  const attrHeights=options.attrHeights||attrs.map(()=>27),opHeights=options.opHeights||ops.map(()=>29);
  const head=42,ah=Math.max(36,attrHeights.reduce((a,b)=>a+b,0)+20),oh=Math.max(36,opHeights.reduce((a,b)=>a+b,0)+20),h=head+ah+oh;
  this.rect(id,x,y,w,h);
  this.text(id+'_name',name,8,4,w-16,head-8,20,'center',true,id,[x,y]);
  for(const [n,yy] of [['attributes',head],['operations',head+ah]]){
   const cid=id+'_'+n+'_separator';this.add(cid,`<mxCell id="${cid}" value="" style="strokeColor=#000000;strokeWidth=1.2;endArrow=none;" edge="1" parent="${id}"><mxGeometry relative="1" as="geometry"><mxPoint x="0" y="${yy}" as="sourcePoint"/><mxPoint x="${w}" y="${yy}" as="targetPoint"/></mxGeometry></mxCell>`);
   this.scene.push({type:'line',points:[[x,y+yy],[x+w,y+yy]],dash:false,arrow:'none'});
  }
  let ay=head+10,oy=head+ah+10;
  attrs.forEach((v,i)=>{this.text(id+'_a'+i,v,12,ay,w-24,attrHeights[i],18,'left',false,id,[x,y]);ay+=attrHeights[i];});
  ops.forEach((v,i)=>{this.text(id+'_o'+i,v,12,oy,w-24,opHeights[i],18,'left',false,id,[x,y]);oy+=opHeights[i];});
  const frame={id,x,y,w,h};this.frames.push(frame);return frame;
 }
 relation(id,source,target,points,kind,label,labelAt){
  const anchor=(f,p)=>[(p[0]-f.x)/f.w,(p[1]-f.y)/f.h];const sa=anchor(source,points[0]),ta=anchor(target,points.at(-1));
  for(const a of [sa,ta])if(a.some(v=>v<0||v>1)||!a.some(v=>v===0||v===1))throw new Error(`Endpoint outside boundary: ${id}`);
  this.line(id,points,{source,target,sourceAnchor:sa,targetAnchor:ta,dash:kind==='dependency',arrow:kind==='inheritance'?'triangle':kind==='association'?'none':'open',label,labelAt});
  this.connectors.push({id,source:source.id,target:target.id,points});
 }
 actor(id,name,x,y){
  this.add(id,`<mxCell id="${id}" value="${esc(name)}" style="shape=umlActor;html=0;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.4;fontFamily=Arial;fontColor=#000000;fontSize=18;verticalLabelPosition=bottom;verticalAlign=top;" vertex="1" parent="1"><mxGeometry x="${x-18}" y="${y}" width="36" height="50" as="geometry"/></mxCell>`);
  this.scene.push({type:'actor',x:x-18,y,w:36,h:50});this.scene.push({type:'text',value:name,x:x-110,y:y+52,w:220,h:28,size:18,align:'center'});
 }
 validateRouting(){
  for(const c of this.connectors)for(let i=1;i<c.points.length;i++){
   const a=c.points[i-1],b=c.points[i];if(a[0]!==b[0]&&a[1]!==b[1])throw new Error(`Nonorthogonal connector ${c.id}`);
   for(const r of this.frames){const hit=a[0]===b[0]?a[0]>r.x&&a[0]<r.x+r.w&&Math.max(a[1],b[1])>r.y&&Math.min(a[1],b[1])<r.y+r.h:a[1]>r.y&&a[1]<r.y+r.h&&Math.max(a[0],b[0])>r.x&&Math.min(a[0],b[0])<r.x+r.w;if(hit)throw new Error(`Connector ${c.id} passes through class ${r.id}`);}
  }
  for(let i=0;i<this.connectors.length;i++)for(let j=i+1;j<this.connectors.length;j++)for(let a=1;a<this.connectors[i].points.length;a++)for(let b=1;b<this.connectors[j].points.length;b++){
   const [p,q]=this.connectors[i].points.slice(a-1,a+1),[r,s]=this.connectors[j].points.slice(b-1,b+1);
   const overlap=p[0]===q[0]&&r[0]===s[0]&&p[0]===r[0]&&Math.min(Math.max(p[1],q[1]),Math.max(r[1],s[1]))>Math.max(Math.min(p[1],q[1]),Math.min(r[1],s[1])) || p[1]===q[1]&&r[1]===s[1]&&p[1]===r[1]&&Math.min(Math.max(p[0],q[0]),Math.max(r[0],s[0]))>Math.max(Math.min(p[0],q[0]),Math.min(r[0],s[0]));
   if(overlap)throw new Error(`Overlapping routes ${this.connectors[i].id} and ${this.connectors[j].id}`);
  }
 }
 save(file,name,prefix='FR09'){
  const model=`<mxGraphModel grid="0" page="1" pageBreaks="0" pageWidth="${this.width}" pageHeight="${this.height}" background="#FFFFFF"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${this.cells.join('\n')}</root></mxGraphModel>`;
  fs.writeFileSync(file,`<mxfile host="app.diagrams.net"><diagram id="${esc(prefix)}-${name.replaceAll(' ','-')}" name="${esc(name)}">${model}</diagram></mxfile>`);
  fs.writeFileSync(file.replace('.drawio','.scene.json'),JSON.stringify({width:this.width,height:this.height,shapes:this.scene},null,2));return model;
 }
}
module.exports=UmlDrawing;
