import fs from 'node:fs';
import path from 'node:path';

const outDir = 'D:/ProjectCapstone/docs/diagrams/report1';
fs.mkdirSync(outDir, { recursive: true });

const C = {
  canvas: '#FAF8F5', sand: '#F3EFE6', white: '#FFFFFF', brand: '#C59B58',
  strong: '#B88E4F', soft: '#FBF5EB', border: '#EEDFC6', dark: '#231D15',
  ink: '#1A1612', muted: '#7D715E', line: '#EAE4D7', peach: '#F7E7CF'
};

const xmlEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const html = (title, lines = []) => `<div style="font-family:Comic Sans MS;font-size:16px;line-height:1.25"><b>${title}</b>${lines.length ? `<br><span style="font-size:13px;color:${C.muted}">${lines.join('<br>')}</span>` : ''}</div>`;
const nodeStyle = (fill = C.white, stroke = C.strong, extra = '') => `rounded=1;arcSize=14;whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=${stroke};strokeWidth=2;fontColor=${C.ink};fontFamily=Comic Sans MS;fontSize=15;align=center;verticalAlign=middle;sketch=1;comic=1;jiggle=2;shadow=0;${extra}`;
const actorStyle = `shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;fillColor=${C.soft};strokeColor=${C.strong};strokeWidth=2;fontColor=${C.ink};fontFamily=Comic Sans MS;fontSize=15;sketch=1;comic=1;jiggle=2;`;
const edgeStyle = `edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=${C.strong};strokeWidth=2;endArrow=classic;endFill=1;fontColor=${C.muted};fontFamily=Comic Sans MS;fontSize=12;labelBackgroundColor=${C.canvas};sketch=1;comic=1;jiggle=2;`;
const dashedEdgeStyle = edgeStyle + 'dashed=1;dashPattern=7 5;';
const associationEdgeStyle = `edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=${C.strong};strokeWidth=1.6;endArrow=none;fontColor=${C.muted};fontFamily=Comic Sans MS;fontSize=12;sketch=1;comic=1;jiggle=2;opacity=72;`;
const plainBoxStyle = `rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#202020;strokeWidth=1.5;fontColor=#111111;fontFamily=Arial;fontSize=15;align=center;verticalAlign=middle;`;
const plainActorStyle = `shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;fillColor=#FFFFFF;strokeColor=#202020;strokeWidth=1.5;fontColor=#111111;fontFamily=Arial;fontSize=15;`;
const plainLineStyle = `edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#202020;strokeWidth=1.5;endArrow=none;fontColor=#333333;fontFamily=Arial;fontSize=12;labelBackgroundColor=#FFFFFF;`;
const plainAssociationStyle = `edgeStyle=none;rounded=0;html=1;strokeColor=#202020;strokeWidth=1.5;endArrow=none;fontColor=#333333;fontFamily=Arial;fontSize=12;labelBackgroundColor=#FFFFFF;`;
const plainFlowStyle = `edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#202020;strokeWidth=1.5;startArrow=classic;startFill=1;endArrow=classic;endFill=1;fontColor=#333333;fontFamily=Arial;fontSize=12;labelBackgroundColor=#FFFFFF;`;
const plainIncludeStyle = `edgeStyle=none;rounded=0;html=1;strokeColor=#202020;strokeWidth=1.4;dashed=1;dashPattern=7 5;endArrow=open;endFill=0;fontColor=#333333;fontFamily=Arial;fontSize=12;labelBackgroundColor=#FFFFFF;`;

function vertex(id, value, x, y, w, h, style = nodeStyle()) {
  return `<mxCell id="${id}" value="${xmlEsc(value)}" style="${xmlEsc(style)}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`;
}
function edge(id, source, target, value = '', style = edgeStyle) {
  return `<mxCell id="${id}" value="${xmlEsc(value)}" style="${xmlEsc(style)}" edge="1" parent="1" source="${source}" target="${target}"><mxGeometry relative="1" as="geometry"/></mxCell>`;
}
function graphModel(cells, background = C.canvas) {
  return `<mxGraphModel dx="1600" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1600" pageHeight="900" background="${background}" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells.join('')}</root></mxGraphModel>`;
}

const pages = [];

// Page 1: Context Diagram
{
  const c = [];
  c.push(vertex('cd-title', '<b>CONTEXT DIAGRAM - SCANMS</b><br><font style="font-size:14px">External actors, systems, and data flows</font>', 300, 20, 1000, 65, 'rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#FFFFFF;fontColor=#111111;fontFamily=Arial;fontSize=26;'));
  c.push(vertex('cd-system', '<b>SCANMS</b><br><font style="font-size:14px">Marketplace &amp; Affiliate Network</font>', 650, 325, 300, 200, 'ellipse;whiteSpace=wrap;html=1;fillColor=#F4C94F;strokeColor=#202020;strokeWidth=2;fontColor=#111111;fontFamily=Arial;fontSize=24;'));
  const actors = [
    ['cd-admin','System Administrator',75,135], ['cd-manager','System Manager',75,315],
    ['cd-shop','Shop Manager',75,495], ['cd-kol','Collaborator / KOL',75,675],
    ['cd-buyer','Buyer / Guest',1295,135], ['cd-ecom','E-commerce Channels<br><font style="font-size:12px">Shopee, TikTok Shop, Shopify</font>',1295,315],
    ['cd-bank','Bank / VietQR',1295,495], ['cd-logistics','Logistics Provider',1295,675]
  ];
  for (const [id,label,x,y] of actors) c.push(vertex(id, `<b>${label}</b>`, x, y, 230, 75, plainBoxStyle));
  c.push(edge('cd-e1','cd-admin','cd-system','audit / users',plainFlowStyle));
  c.push(edge('cd-e2','cd-manager','cd-system','approval / operations',plainFlowStyle));
  c.push(edge('cd-e3','cd-shop','cd-system','catalog / orders / payout',plainFlowStyle));
  c.push(edge('cd-e4','cd-kol','cd-system','KYC / links / earnings',plainFlowStyle));
  c.push(edge('cd-e5','cd-buyer','cd-system','browse / checkout / tracking',plainFlowStyle));
  c.push(edge('cd-e6','cd-ecom','cd-system','orders / reconciliation',plainFlowStyle));
  c.push(edge('cd-e7','cd-bank','cd-system','payout / transfer proof',plainFlowStyle));
  c.push(edge('cd-e8','cd-logistics','cd-system','shipment status',plainFlowStyle));
  pages.push({ id:'cd', name:'01 - Context Diagram (CD)', model:graphModel(c, '#FFFFFF') });
}

// Page 2: Overall Use Case Diagram
{
  const c = [];
  c.push(vertex('ud-title', '<b>USE CASE DIAGRAM - SCANMS</b><br><font style="font-size:14px">High-level use cases and actors</font>', 300, 20, 1000, 65, 'rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#FFFFFF;fontColor=#111111;fontFamily=Arial;fontSize=26;'));
  c.push(vertex('ud-boundary', '<b>SCANMS SYSTEM BOUNDARY</b>', 300, 105, 1000, 720, 'shape=swimlane;startSize=38;horizontal=1;rounded=0;whiteSpace=wrap;html=1;fillColor=#FAFAFA;swimlaneFillColor=#FFFFFF;strokeColor=#202020;strokeWidth=1.5;fontColor=#111111;fontFamily=Arial;fontSize=16;'));
  const actorDefs = [
    ['ud-admin','System\nAdministrator',50,130], ['ud-manager','System\nManager',50,350], ['ud-shop','Shop\nManager',50,610],
    ['ud-kol','Collaborator\nKOL / KOC',1370,150], ['ud-buyer','Buyer /\nGuest',1370,590]
  ];
  for (const [id,label,x,y] of actorDefs) c.push(vertex(id, `<b>${label.replace(/\n/g,'<br>')}</b>`, x, y, 210, 110, plainActorStyle));
  const ucStyle = 'ellipse;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#202020;strokeWidth=1.5;fontColor=#111111;fontFamily=Arial;fontSize=13;';
  const ucs = [
    ['uc1','Audit platform & users',360,145,260,70], ['uc4','View platform analytics',360,235,260,70],
    ['uc2','Review fraud & compliance',360,365,260,70], ['uc3','Approve stores & products',360,455,260,70],
    ['uc5','Manage catalog & media',490,535,260,60], ['uc6','Partners, campaigns & samples',490,605,260,60],
    ['uc7','Orders & commissions',490,675,260,60], ['uc8','Payouts & chat',490,745,260,60],
    ['uc9','KYC & channels',930,140,240,60], ['uc10','Links, QR & coupons',930,220,240,60],
    ['uc11','Media, samples & campaigns',930,300,240,60], ['uc12','Analytics, wallet & messages',930,380,240,60],
    ['uc13','Browse products & creator content',970,565,220,70], ['uc14','Checkout, track & review',970,665,220,70],
    ['uc15','Record referral attribution',805,752,190,55]
  ];
  for (const [id,label,x,y,w,h] of ucs) c.push(vertex(id, `<b>${label}</b>`, x, y, w, h, ucStyle));
  c.push(edge('ud-e1','ud-admin','uc1','',plainAssociationStyle)); c.push(edge('ud-e2','ud-admin','uc4','',plainAssociationStyle));
  c.push(edge('ud-e3','ud-manager','uc2','',plainAssociationStyle)); c.push(edge('ud-e4','ud-manager','uc3','',plainAssociationStyle));
  c.push(edge('ud-e5','ud-shop','uc5','',plainAssociationStyle)); c.push(edge('ud-e6','ud-shop','uc6','',plainAssociationStyle)); c.push(edge('ud-e7','ud-shop','uc7','',plainAssociationStyle)); c.push(edge('ud-e8','ud-shop','uc8','',plainAssociationStyle));
  c.push(edge('ud-e9','ud-kol','uc9','',plainAssociationStyle)); c.push(edge('ud-e10','ud-kol','uc10','',plainAssociationStyle)); c.push(edge('ud-e11','ud-kol','uc11','',plainAssociationStyle)); c.push(edge('ud-e12','ud-kol','uc12','',plainAssociationStyle));
  c.push(edge('ud-e13','ud-buyer','uc13','',plainAssociationStyle)); c.push(edge('ud-e14','ud-buyer','uc14','',plainAssociationStyle));
  c.push(edge('ud-inc1','uc14','uc15','«include»',plainIncludeStyle));
  pages.push({ id:'ud', name:'02 - Use Case Diagram (UD)', model:graphModel(c, '#FFFFFF') });
}

// Page 3: Actor Map
{
  const c = [];
  c.push(vertex('act-title', '<b>ACTORS OF SCANMS</b><br><font style="font-size:14px">Authenticated users, public user, and external systems</font>', 300, 20, 1000, 65, 'rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#FFFFFF;fontColor=#111111;fontFamily=Arial;fontSize=26;'));
  c.push(vertex('act-center', '<b>SCANMS</b><br><font style="font-size:14px">Marketplace &amp; Affiliate Network</font>', 650, 320, 300, 180, 'ellipse;whiteSpace=wrap;html=1;fillColor=#F4C94F;strokeColor=#202020;strokeWidth=2;fontColor=#111111;fontFamily=Arial;fontSize=24;'));
  const actors = [
    ['a1','<b>System Administrator</b>',65,135],
    ['a2','<b>System Manager</b>',65,360],
    ['a3','<b>Shop Manager</b>',65,585],
    ['a4','<b>Collaborator / KOL</b>',1355,185],
    ['a5','<b>Buyer / Guest</b>',1355,500]
  ];
  for (const [id,label,x,y] of actors) c.push(vertex(id,label,x,y,180,120,plainActorStyle));
  c.push(edge('ae1','a1','act-center','',plainLineStyle));
  c.push(edge('ae2','a2','act-center','',plainLineStyle));
  c.push(edge('ae3','a3','act-center','',plainLineStyle));
  c.push(edge('ae4','a4','act-center','',plainLineStyle));
  c.push(edge('ae5','a5','act-center','',plainLineStyle));
  c.push(vertex('ext1', '<b>E-commerce Channels</b><br><font style="font-size:12px">Shopee, TikTok Shop, Shopify</font>', 420, 705, 230, 70, plainBoxStyle));
  c.push(vertex('ext2', '<b>Bank / VietQR</b><br><font style="font-size:12px">Payout &amp; transfer proof</font>', 685, 705, 230, 70, plainBoxStyle));
  c.push(vertex('ext3', '<b>Logistics</b><br><font style="font-size:12px">GHN, GHTK</font>', 950, 705, 230, 70, plainBoxStyle));
  c.push(edge('aex1','ext1','act-center','',plainLineStyle));
  c.push(edge('aex2','ext2','act-center','',plainLineStyle));
  c.push(edge('aex3','ext3','act-center','',plainLineStyle));
  pages.push({ id:'actors', name:'03 - Actors', model:graphModel(c, '#FFFFFF') });
}

// Page 4: Functional Requirements map
{
  const c = [];
  c.push(vertex('fr-title', '<b>FUNCTIONAL REQUIREMENTS (FR)</b><br><font style="font-size:14px">Report 1 baseline: FR-01 to FR-32</font>', 300, 18, 1000, 65, 'rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#FFFFFF;fontColor=#111111;fontFamily=Arial;fontSize=26;'));
  const modules = [
    ['m1','IDENTITY & PARTNER PROFILE',['FR-01 Login/JWT/2FA','FR-02 Four-role RBAC','FR-03 Financial KYC','FR-04 Social channels','FR-05 KOL tiering'],45,115],
    ['m2','STORE, CATALOG & MEDIA',['FR-06 Store settings','FR-07 Product catalog','FR-08 Media Hub','FR-09 Monthly bonus rules'],435,115],
    ['m3','LINKS & ATTRIBUTION',['FR-10 Short referral links','FR-11 Dynamic QR','FR-12 Creator coupons','FR-13 Last-click + cookie','FR-14 Redis anti-spam'],825,115],
    ['m4','BUYER & ORDER INTAKE',['FR-15 Product landing','FR-16 Guest checkout','FR-17 Public tracking','FR-18 Product review','FR-19 External webhook','FR-20 Manual/Excel import'],1215,115],
    ['m5','COMMISSION & PAYOUT',['FR-21 Commission + 14-day hold','FR-22 Payout row locking','FR-23 Ledger + PIT tax','FR-24 Approve + batch export'],45,465],
    ['m6','PARTNER ENGAGEMENT',['FR-25 Realtime chat','FR-26 Sample request','FR-27 Campaign invitation'],435,465],
    ['m7','ANALYTICS',['FR-28 Realtime dashboard','FR-29 KOL leaderboard'],825,465],
    ['m8','AI & AUDIT',['FR-30 Smart KOL matching','FR-31 Fraud detection','FR-32 Audit logs'],1215,465]
  ];
  for (const [id,title,lines,x,y] of modules) {
    const content = `<div style="font-family:Arial;font-size:15px;line-height:1.55;text-align:left"><b>${title}</b><br>${lines.map(t=>`- ${t}`).join('<br>')}</div>`;
    c.push(vertex(id, content, x, y, 340, 285, plainBoxStyle + 'align=left;verticalAlign=top;spacingLeft=18;spacingTop=18;'));
  }
  pages.push({ id:'fr', name:'04 - Functional Requirements', model:graphModel(c, '#FFFFFF') });
}

const drawio = `<?xml version="1.0" encoding="UTF-8"?><mxfile host="app.diagrams.net" modified="2026-09-17T00:00:00.000Z" agent="Codex" version="24.7.17" type="device" compressed="false" pages="${pages.length}">${pages.map(p=>`<diagram id="${p.id}" name="${xmlEsc(p.name)}">${p.model}</diagram>`).join('')}</mxfile>`;
fs.writeFileSync(path.join(outDir, 'SCANMS_Report1_CD_UD_Actors_FR.drawio'), drawio, 'utf8');

function svgHead(title, subtitle) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs><filter id="rough"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="1" seed="8" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="0.75"/></filter><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${C.strong}"/></marker><pattern id="paper" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M0 31.5H32" stroke="${C.line}" stroke-width="0.45" opacity=".35"/></pattern></defs>
  <rect width="1600" height="900" fill="${C.canvas}"/><rect width="1600" height="900" fill="url(#paper)"/>
  <path d="M65 70 C170 56 260 82 355 66" fill="none" stroke="${C.brand}" stroke-width="4" stroke-linecap="round" filter="url(#rough)"/>
  <text x="800" y="55" text-anchor="middle" font-family="Comic Sans MS, cursive" font-size="30" font-weight="700" fill="${C.dark}">${title}</text>
  <text x="800" y="84" text-anchor="middle" font-family="Comic Sans MS, cursive" font-size="15" fill="${C.muted}">${subtitle}</text>`;
}
const svgFoot = (n) => `<text x="1535" y="870" text-anchor="end" font-family="Comic Sans MS, cursive" font-size="13" fill="${C.muted}">SCANMS • Report 1 • ${n}/4</text><path d="M1280 850 q45 18 90 0 t90 0" fill="none" stroke="${C.brand}" stroke-width="2" stroke-linecap="round" filter="url(#rough)"/></svg>`;
function textLines(x,y,lines,{size=16,anchor='middle',weight=400,color=C.ink,gap=22}={}) {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Comic Sans MS, cursive" font-size="${size}" font-weight="${weight}" fill="${color}">${lines.map((l,i)=>`<tspan x="${x}" dy="${i===0?0:gap}">${xmlEsc(l)}</tspan>`).join('')}</text>`;
}
function roughRect(x,y,w,h,{fill=C.white,stroke=C.strong,r=22,sw=3,rotate=0}={}) {
  const cx=x+w/2, cy=y+h/2; return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" filter="url(#rough)" transform="rotate(${rotate} ${cx} ${cy})"/>`;
}
function arrowPath(d,label,x,y,dashed=false) { return `<path d="${d}" fill="none" stroke="${C.strong}" stroke-width="2.5" stroke-linecap="round" ${dashed?'stroke-dasharray="8 7"':''} marker-end="url(#arrow)" filter="url(#rough)"/>${label?`<rect x="${x-90}" y="${y-15}" width="180" height="25" rx="9" fill="${C.canvas}" opacity=".94"/>${textLines(x,y+3,[label],{size:12,color:C.muted})}`:''}`; }
function associationPath(d) { return `<path d="${d}" fill="none" stroke="${C.strong}" stroke-width="1.8" stroke-linecap="round" opacity=".68" filter="url(#rough)"/>`; }
function actorSvg(cx,y,label) { return `<g filter="url(#rough)" stroke="${C.strong}" stroke-width="3" fill="none" stroke-linecap="round"><circle cx="${cx}" cy="${y+23}" r="18" fill="${C.soft}"/><path d="M${cx} ${y+42}v38 M${cx-30} ${y+58}h60 M${cx} ${y+80}l-26 35 M${cx} ${y+80}l26 35"/></g>${textLines(cx,y+139,label.split('|'),{size:15,weight:700,gap:19})}`; }
function simpleSvgHead(title, subtitle) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900"><defs><marker id="simpleArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#202020"/></marker><marker id="simpleOpenArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1 L9 5 L1 9" fill="none" stroke="#202020" stroke-width="1.5"/></marker></defs><rect width="1600" height="900" fill="#FFFFFF"/><text x="800" y="52" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#111111">${xmlEsc(title)}</text><text x="800" y="80" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" fill="#444444">${xmlEsc(subtitle)}</text><line x1="80" y1="98" x2="1520" y2="98" stroke="#D0D0D0" stroke-width="1"/>`;
}
const simpleSvgFoot = (n) => `<text x="1520" y="875" text-anchor="end" font-family="Arial, sans-serif" font-size="12" fill="#666666">SCANMS - Report 1 - ${n}/4</text></svg>`;
function simpleText(x,y,lines,{size=16,anchor='middle',weight=400,color='#111111',gap=22}={}) {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${lines.map((l,i)=>`<tspan x="${x}" dy="${i===0?0:gap}">${xmlEsc(l)}</tspan>`).join('')}</text>`;
}
function simpleActorSvg(cx,y,label) {
  return `<g stroke="#202020" stroke-width="2" fill="none"><circle cx="${cx}" cy="${y+22}" r="18"/><path d="M${cx} ${y+40}v42 M${cx-30} ${y+58}h60 M${cx} ${y+82}l-27 36 M${cx} ${y+82}l27 36"/></g>${simpleText(cx,y+144,label.split('|'),{size:15,weight:600,gap:19})}`;
}

// SVG 1 CD
{
  let s=simpleSvgHead('CONTEXT DIAGRAM - SCANMS','External actors, systems, and data flows');
  const left=[
    ['System Administrator','audit / users',130,350],
    ['System Manager','approval / operations',310,400],
    ['Shop Manager','catalog / orders / payout',490,450],
    ['Collaborator / KOL','KYC / links / earnings',670,500]
  ];
  const right=[
    ['Buyer / Guest','browse / checkout / tracking',130,350],
    ['E-commerce Channels','orders / reconciliation',310,400],
    ['Bank / VietQR','payout / transfer proof',490,450],
    ['Logistics Provider','shipment status',670,500]
  ];
  for(let i=0;i<4;i++){
    const ly=left[i][2]+35, lty=left[i][3], ry=right[i][2]+35, rty=right[i][3];
    s+=`<path d="M310 ${ly} C450 ${ly},540 ${lty},650 ${lty}" fill="none" stroke="#202020" stroke-width="1.5" marker-start="url(#simpleArrow)" marker-end="url(#simpleArrow)"/>`;
    s+=`<path d="M1290 ${ry} C1150 ${ry},1060 ${rty},950 ${rty}" fill="none" stroke="#202020" stroke-width="1.5" marker-start="url(#simpleArrow)" marker-end="url(#simpleArrow)"/>`;
    const lly=(ly+lty)/2, rly=(ry+rty)/2;
    s+=`<rect x="380" y="${lly-14}" width="220" height="22" fill="#FFFFFF"/>`;s+=simpleText(490,lly+2,[left[i][1]],{size:12,color:'#333333'});
    s+=`<rect x="1000" y="${rly-14}" width="220" height="22" fill="#FFFFFF"/>`;s+=simpleText(1110,rly+2,[right[i][1]],{size:12,color:'#333333'});
  }
  s+=`<ellipse cx="800" cy="425" rx="150" ry="100" fill="#F4C94F" stroke="#202020" stroke-width="2"/>`;
  s+=simpleText(800,417,['SCANMS'],{size:28,weight:700});s+=simpleText(800,448,['Marketplace & Affiliate Network'],{size:14,color:'#333333'});
  for(let i=0;i<4;i++){
    const y=left[i][2];
    s+=`<rect x="80" y="${y}" width="230" height="70" fill="#FFFFFF" stroke="#202020" stroke-width="1.5"/>`;s+=simpleText(195,y+42,[left[i][0]],{size:15,weight:600});
    s+=`<rect x="1290" y="${y}" width="230" height="70" fill="#FFFFFF" stroke="#202020" stroke-width="1.5"/>`;s+=simpleText(1405,y+35,[right[i][0]],{size:15,weight:600});
    if(i===1)s+=simpleText(1405,y+56,['Shopee, TikTok Shop, Shopify'],{size:11,color:'#444444'});
  }
  s+=simpleSvgFoot(1); fs.writeFileSync(path.join(outDir,'01_CONTEXT_DIAGRAM.svg'),s,'utf8');
}

// SVG 2 UD
{
  let s=simpleSvgHead('USE CASE DIAGRAM - SCANMS','High-level use cases and actors');
  s+=`<rect x="300" y="110" width="1000" height="720" fill="#FAFAFA" stroke="#202020" stroke-width="1.5"/>`;
  s+=simpleText(800,134,['SCANMS SYSTEM BOUNDARY'],{size:17,weight:700});
  const ellipses=[
    [490,180,130,35,'Audit platform & users'],[490,270,130,35,'View platform analytics'],
    [490,400,130,35,'Review fraud & compliance'],[490,490,130,35,'Approve stores & products'],
    [620,565,130,30,'Manage catalog & media'],[620,635,130,30,'Partners, campaigns & samples'],
    [620,705,130,30,'Orders & commissions'],[620,775,130,30,'Payouts & chat'],
    [1050,170,120,30,'KYC & channels'],[1050,250,120,30,'Links, QR & coupons'],
    [1050,330,120,30,'Media, samples & campaigns'],[1050,410,120,30,'Analytics, wallet & messages'],
    [1080,600,110,35,'Browse products & creator content'],[1080,700,110,35,'Checkout, track & review'],
    [900,780,95,28,'Record referral attribution']
  ];
  const assoc=[
    'M185 193 L360 180','M185 193 L360 270',
    'M185 408 L360 400','M185 408 L360 490',
    'M185 668 L490 565','M185 668 L490 635','M185 668 L490 705','M185 668 L490 775',
    'M1420 208 L1170 170','M1420 208 L1170 250','M1420 208 L1170 330','M1420 208 L1170 410',
    'M1420 648 L1190 600','M1420 648 L1190 700'
  ];
  s+=`<g fill="none" stroke="#202020" stroke-width="1.3">${assoc.map(d=>`<path d="${d}"/>`).join('')}</g>`;
  for(const [cx,cy,rx,ry,label] of ellipses){s+=`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#FFFFFF" stroke="#202020" stroke-width="1.5"/>`;s+=simpleText(cx,cy+5,[label],{size:13,weight:600});}
  s+=`<path d="M970 720 L995 780" fill="none" stroke="#202020" stroke-width="1.3" stroke-dasharray="7 5" marker-end="url(#simpleOpenArrow)"/><rect x="935" y="739" width="100" height="22" fill="#FFFFFF"/>`;s+=simpleText(985,754,['«include»'],{size:11,color:'#333333'});
  s+=simpleActorSvg(155,135,'System|Administrator');s+=simpleActorSvg(155,350,'System|Manager');s+=simpleActorSvg(155,610,'Shop|Manager');s+=simpleActorSvg(1450,150,'Collaborator|KOL / KOC');s+=simpleActorSvg(1450,590,'Buyer /|Guest');
  s+=simpleSvgFoot(2); fs.writeFileSync(path.join(outDir,'02_USE_CASE_DIAGRAM.svg'),s,'utf8');
}

// SVG 3 Actors
{
  let s=simpleSvgHead('ACTORS OF SCANMS','Authenticated users, public user, and external systems');
  s+=`<g fill="none" stroke="#202020" stroke-width="1.5"><path d="M185 193 L650 355"/><path d="M185 413 L650 405"/><path d="M185 633 L650 465"/><path d="M1415 248 L950 360"/><path d="M1415 563 L950 450"/><path d="M565 715 L710 500"/><path d="M805 715 L800 500"/><path d="M1045 715 L890 500"/></g>`;
  s+=`<ellipse cx="800" cy="410" rx="150" ry="90" fill="#F4C94F" stroke="#202020" stroke-width="2"/>`;
  s+=simpleText(800,402,['SCANMS'],{size:27,weight:700});s+=simpleText(800,432,['Marketplace & Affiliate Network'],{size:14,color:'#333333'});
  s+=simpleActorSvg(155,135,'System|Administrator');s+=simpleActorSvg(155,355,'System|Manager');s+=simpleActorSvg(155,575,'Shop|Manager');
  s+=simpleActorSvg(1445,190,'Collaborator /|KOL');s+=simpleActorSvg(1445,505,'Buyer / Guest');
  const external=[
    [450,'E-commerce Channels','Shopee, TikTok Shop, Shopify'],
    [690,'Bank / VietQR','Payout and transfer proof'],
    [930,'Logistics','GHN, GHTK']
  ];
  for(const [x,title,sub] of external){s+=`<rect x="${x}" y="715" width="230" height="70" fill="#FFFFFF" stroke="#202020" stroke-width="1.5"/>`;s+=simpleText(x+115,744,[title],{size:14,weight:700});s+=simpleText(x+115,768,[sub],{size:12,color:'#444444'});}
  s+=simpleSvgFoot(3); fs.writeFileSync(path.join(outDir,'03_ACTOR_MAP.svg'),s,'utf8');
}

// SVG 4 FR
{
  let s=simpleSvgHead('FUNCTIONAL REQUIREMENTS (FR)','Report 1 baseline: FR-01 to FR-32');
  const modules=[
    ['IDENTITY & PARTNER PROFILE',['FR-01 Login/JWT/2FA','FR-02 Four-role RBAC','FR-03 Financial KYC','FR-04 Social channels','FR-05 KOL tiering'],45,115],
    ['STORE, CATALOG & MEDIA',['FR-06 Store settings','FR-07 Product catalog','FR-08 Media Hub','FR-09 Monthly bonuses'],435,115],
    ['LINKS & ATTRIBUTION',['FR-10 Short links','FR-11 Dynamic QR','FR-12 Creator coupons','FR-13 Last-click cookie','FR-14 Redis anti-spam'],825,115],
    ['BUYER & ORDER INTAKE',['FR-15 Product landing','FR-16 Guest checkout','FR-17 Public tracking','FR-18 Product review','FR-19 External webhook','FR-20 Manual/Excel import'],1215,115],
    ['COMMISSION & PAYOUT',['FR-21 Commission + hold','FR-22 Payout row lock','FR-23 Ledger + PIT tax','FR-24 Approve + export'],45,465],
    ['PARTNER ENGAGEMENT',['FR-25 Realtime chat','FR-26 Sample request','FR-27 Campaign invitation'],435,465],
    ['ANALYTICS',['FR-28 Realtime dashboard','FR-29 KOL leaderboard'],825,465],
    ['AI & AUDIT',['FR-30 Smart KOL match','FR-31 Fraud detection','FR-32 Audit logs'],1215,465]
  ];
  for(const [title,items,x,y] of modules){s+=`<rect x="${x}" y="${y}" width="340" height="285" fill="#FFFFFF" stroke="#202020" stroke-width="1.5"/>`;s+=simpleText(x+20,y+38,[title],{size:15,anchor:'start',weight:700});s+=simpleText(x+20,y+76,items.map(v=>`- ${v}`),{size:13,anchor:'start',gap:29});}
  s+=simpleSvgFoot(4); fs.writeFileSync(path.join(outDir,'04_FUNCTIONAL_REQUIREMENTS_MAP.svg'),s,'utf8');
}

const readme = `# SCANMS Report 1 – Diagram Pack\n\n- \`SCANMS_Report1_CD_UD_Actors_FR.drawio\`: four editable overview pages for diagrams.net / Draw.io.\n- \`detailed-usecases/SCANMS_DETAILED_USE_CASES.drawio\`: six detailed actor-specific Use Case pages for the project report.\n- \`01_CONTEXT_DIAGRAM.svg\`: formal system context view.\n- \`02_USE_CASE_DIAGRAM.svg\`: overall use case view.\n- \`03_ACTOR_MAP.svg\`: presentation-friendly actor map.\n- \`04_FUNCTIONAL_REQUIREMENTS_MAP.svg\`: FR-01 through FR-32 grouped into eight modules.\n- Matching PNG exports are intended for 16:9 presentation slides.\n\nVisual system: simple academic style across all pages, with white backgrounds, black lines, standard typography, and one pale-yellow SCANMS accent on the context and actor overviews.\n\nAuthoritative baseline: four authenticated roles from \`backend/prisma/schema.prisma\`, Buyer/Guest as a public external actor, and the 32-FR execution baseline from \`docs/4_PERSON_TEAM_EXECUTION_GUIDE.md\`.\n`;
fs.writeFileSync(path.join(outDir,'README.md'),readme,'utf8');

console.log(`Generated ${pages.length} Draw.io pages and 4 SVG slides in ${outDir}`);
