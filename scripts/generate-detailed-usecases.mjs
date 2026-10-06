import fs from 'node:fs';
import path from 'node:path';

const outDir = 'D:/ProjectCapstone/docs/diagrams/report1/detailed-usecases';
fs.mkdirSync(outDir, { recursive: true });

const xmlEsc = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const actorStyle = 'shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;fillColor=#FFFFFF;strokeColor=#202020;strokeWidth=1.5;fontColor=#111111;fontFamily=Arial;fontSize=14;';
const boxStyle = 'rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#202020;strokeWidth=1.5;fontColor=#111111;fontFamily=Arial;fontSize=13;';
const useCaseStyle = 'ellipse;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#202020;strokeWidth=1.5;fontColor=#111111;fontFamily=Arial;fontSize=13;';
const associationStyle = 'edgeStyle=none;rounded=0;html=1;strokeColor=#202020;strokeWidth=1.4;endArrow=none;';
const relationStyle = 'edgeStyle=none;rounded=0;html=1;strokeColor=#202020;strokeWidth=1.3;dashed=1;dashPattern=7 5;endArrow=open;endFill=0;fontColor=#333333;fontFamily=Arial;fontSize=11;labelBackgroundColor=#FFFFFF;';

function vertex(id, value, x, y, w, h, style) {
  return `<mxCell id="${id}" value="${xmlEsc(value)}" style="${xmlEsc(style)}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`;
}

function edge(id, source, target, value = '', style = associationStyle) {
  return `<mxCell id="${id}" value="${xmlEsc(value)}" style="${xmlEsc(style)}" edge="1" parent="1" source="${source}" target="${target}"><mxGeometry relative="1" as="geometry"/></mxCell>`;
}

const pages = [
  {
    id: 'platform', file: 'D01_PLATFORM_ADMIN_MANAGER', name: '01 - Platform Administration',
    title: 'DETAILED USE CASE - PLATFORM ADMINISTRATION', subtitle: 'System Administrator and System Manager',
    actors: [
      { id:'admin', label:['System','Administrator'], side:'left', x:150, y:270 },
      { id:'manager', label:['System','Manager'], side:'right', x:1450, y:410 }
    ],
    useCases: [
      {id:'p01', fr:'FR-01', label:'Login and OTP 2FA', cx:800, cy:170, rx:145, ry:36},
      {id:'p02', fr:'FR-02', label:'Enforce role-based access', cx:800, cy:260, rx:145, ry:36},
      {id:'p28', fr:'FR-28', label:'Monitor platform dashboard', cx:510, cy:400, rx:145, ry:36},
      {id:'p29', fr:'FR-29', label:'View KOL leaderboard', cx:510, cy:500, rx:145, ry:36},
      {id:'p32', fr:'FR-32', label:'Review immutable audit logs', cx:510, cy:600, rx:145, ry:36},
      {id:'ponboard', fr:'OPS', label:'Approve and onboard stores', cx:1080, cy:400, rx:145, ry:36},
      {id:'p03', fr:'FR-03', label:'Review financial KYC', cx:1080, cy:500, rx:145, ry:36},
      {id:'p31', fr:'FR-31', label:'Investigate fraud alerts', cx:1080, cy:600, rx:145, ry:36}
    ],
    associations: [
      ['admin','p01'],['admin','p02'],['admin','p28'],['admin','p29'],['admin','p32'],
      ['manager','p01'],['manager','p02'],['manager','ponboard'],['manager','p03'],['manager','p31']
    ],
    relations: [ ['p31','p32','«extend» creates audit event'], ['p01','p02','«include» authorization'] ]
  },
  {
    id: 'shop_ops', file: 'D02_SHOP_CATALOG_ORDER', name: '02 - Shop Catalog and Orders',
    title: 'DETAILED USE CASE - SHOP CATALOG & ORDER OPERATIONS', subtitle: 'Shop Manager, e-commerce channels, and scheduler',
    actors: [
      { id:'shopA', label:['Shop Manager','(catalog)'], side:'left', x:150, y:300 },
      { id:'shopB', label:['Shop Manager','(orders)'], side:'right', x:1450, y:430 },
      { id:'ecom', label:['E-commerce','Shopee / TikTok / Shopify'], side:'right', kind:'box', x:1450, y:180 },
      { id:'scheduler', label:['14-day','Scheduler'], side:'right', kind:'box', x:1450, y:700 }
    ],
    useCases: [
      {id:'s03', fr:'FR-03', label:'Approve collaborator KYC', cx:510, cy:170, rx:150, ry:34},
      {id:'s06', fr:'FR-06', label:'Configure store settings', cx:510, cy:260, rx:150, ry:34},
      {id:'s07', fr:'FR-07', label:'Manage products and inventory', cx:510, cy:350, rx:150, ry:34},
      {id:'s08', fr:'FR-08', label:'Upload marketing media', cx:510, cy:440, rx:150, ry:34},
      {id:'s09', fr:'FR-09', label:'Configure monthly bonus rules', cx:510, cy:530, rx:150, ry:34},
      {id:'s19', fr:'FR-19', label:'Receive external order webhook', cx:960, cy:300, rx:150, ry:34},
      {id:'s20', fr:'FR-20', label:'Create or import orders', cx:1130, cy:410, rx:150, ry:34},
      {id:'s21', fr:'FR-21', label:'Calculate and hold commission', cx:960, cy:520, rx:150, ry:34},
      {id:'s21b', fr:'FR-21', label:'Approve or reverse after 14 days', cx:1130, cy:630, rx:150, ry:34}
    ],
    associations: [
      ['shopA','s03'],['shopA','s06'],['shopA','s07'],['shopA','s08'],['shopA','s09'],
      ['shopB','s19'],['shopB','s20'],['shopB','s21'],['shopB','s21b'],['ecom','s19'],['scheduler','s21b']
    ],
    relations: [ ['s19','s21','«include» commission'], ['s20','s21','«include» commission'], ['s21b','s21','«extend» approve / clawback'] ]
  },
  {
    id: 'shop_partner', file: 'D03_SHOP_FINANCE_PARTNER', name: '03 - Shop Finance and Partners',
    title: 'DETAILED USE CASE - SHOP FINANCE & PARTNER ENGAGEMENT', subtitle: 'Shop Manager collaborates with KOLs and payment services',
    actors: [
      { id:'shop', label:['Shop','Manager'], side:'left', x:150, y:390 },
      { id:'kol', label:['Collaborator','KOL / KOC'], side:'right', x:1450, y:390 },
      { id:'bank', label:['Bank / VietQR'], side:'right', kind:'box', x:1450, y:590 }
    ],
    useCases: [
      {id:'sp25', fr:'FR-25', label:'Realtime one-to-one chat', cx:800, cy:170, rx:150, ry:34},
      {id:'sp27', fr:'FR-27', label:'Invite KOL to campaigns', cx:800, cy:260, rx:150, ry:34},
      {id:'sp26', fr:'FR-26', label:'Approve sample requests', cx:800, cy:350, rx:150, ry:34},
      {id:'sp24', fr:'FR-24', label:'Approve payout and upload proof', cx:800, cy:500, rx:155, ry:36},
      {id:'sp28', fr:'FR-28', label:'View realtime sales analytics', cx:510, cy:590, rx:155, ry:36},
      {id:'sp30', fr:'FR-30', label:'Request AI KOL recommendations', cx:510, cy:700, rx:155, ry:36},
      {id:'sp22', fr:'FR-22', label:'Submit payout request', cx:1090, cy:610, rx:150, ry:36},
      {id:'sp23', fr:'FR-23', label:'View ledger and PIT deduction', cx:1090, cy:710, rx:150, ry:36},
      {id:'sp29', fr:'FR-29', label:'View monthly leaderboard', cx:800, cy:790, rx:150, ry:32}
    ],
    associations: [
      ['shop','sp25'],['shop','sp26'],['shop','sp27'],['shop','sp24'],['shop','sp28'],['shop','sp30'],
      ['kol','sp25'],['kol','sp26'],['kol','sp27'],['kol','sp22'],['kol','sp23'],['kol','sp29'],['bank','sp24']
    ],
    relations: [ ['sp24','sp22','«include» settlement'], ['sp27','sp25','«include» invitation message'] ]
  },
  {
    id: 'kol_promo', file: 'D04_KOL_ONBOARDING_PROMOTION', name: '04 - KOL Onboarding and Promotion',
    title: 'DETAILED USE CASE - KOL ONBOARDING & PROMOTION', subtitle: 'Collaborator profile, channels, media, referral links, and tracking',
    actors: [
      { id:'kolA', label:['Collaborator','(onboarding)'], side:'left', x:150, y:330 },
      { id:'kolB', label:['Collaborator','(promotion)'], side:'right', x:1450, y:330 },
      { id:'buyer', label:['Buyer / Guest'], side:'right', x:1450, y:690 }
    ],
    useCases: [
      {id:'k01', fr:'FR-01', label:'Register, login, and use 2FA', cx:510, cy:170, rx:155, ry:34},
      {id:'k03', fr:'FR-03', label:'Submit financial KYC', cx:510, cy:270, rx:155, ry:34},
      {id:'k04', fr:'FR-04', label:'Manage social channels', cx:510, cy:370, rx:155, ry:34},
      {id:'k05', fr:'FR-05', label:'View automatic KOL tier', cx:510, cy:470, rx:155, ry:34},
      {id:'k08', fr:'FR-08', label:'Download and copy media assets', cx:1080, cy:150, rx:160, ry:34},
      {id:'k10', fr:'FR-10', label:'Generate short referral link', cx:1080, cy:240, rx:160, ry:34},
      {id:'k11', fr:'FR-11', label:'Generate dynamic QR code', cx:1080, cy:330, rx:160, ry:34},
      {id:'k12', fr:'FR-12', label:'Create personal coupon', cx:1080, cy:420, rx:160, ry:34},
      {id:'k13', fr:'FR-13', label:'Record last-click attribution', cx:1080, cy:540, rx:160, ry:34},
      {id:'k14', fr:'FR-14', label:'Apply Redis click rate limit', cx:1080, cy:630, rx:160, ry:34}
    ],
    associations: [
      ['kolA','k01'],['kolA','k03'],['kolA','k04'],['kolA','k05'],
      ['kolB','k08'],['kolB','k10'],['kolB','k11'],['kolB','k12'],['buyer','k13']
    ],
    relations: [ ['k11','k10','«include» referral link'], ['k13','k14','«include» anti-spam check'] ]
  },
  {
    id: 'kol_earn', file: 'D05_KOL_EARNINGS_ENGAGEMENT', name: '05 - KOL Earnings and Engagement',
    title: 'DETAILED USE CASE - KOL EARNINGS & ENGAGEMENT', subtitle: 'Commission, wallet, payout, collaboration, and analytics',
    actors: [
      { id:'kol', label:['Collaborator','KOL / KOC'], side:'left', x:150, y:390 },
      { id:'shop', label:['Shop','Manager'], side:'right', x:1450, y:390 },
      { id:'bank', label:['Bank / VietQR'], side:'right', kind:'box', x:1450, y:710 }
    ],
    useCases: [
      {id:'ke25', fr:'FR-25', label:'Realtime one-to-one chat', cx:800, cy:170, rx:150, ry:34},
      {id:'ke26', fr:'FR-26', label:'Request and track product sample', cx:800, cy:260, rx:150, ry:34},
      {id:'ke27', fr:'FR-27', label:'Accept campaign invitation', cx:800, cy:350, rx:150, ry:34},
      {id:'ke21', fr:'FR-21', label:'View pending and approved commission', cx:510, cy:500, rx:165, ry:36},
      {id:'ke22', fr:'FR-22', label:'Request payout with wallet lock', cx:510, cy:600, rx:165, ry:36},
      {id:'ke23', fr:'FR-23', label:'View immutable ledger and PIT tax', cx:510, cy:700, rx:165, ry:36},
      {id:'ke24', fr:'FR-24', label:'Approve payout and attach bank proof', cx:1090, cy:500, rx:165, ry:36},
      {id:'ke28', fr:'FR-28', label:'View realtime performance dashboard', cx:1090, cy:600, rx:165, ry:36},
      {id:'ke29', fr:'FR-29', label:'View gamified KOL leaderboard', cx:1090, cy:700, rx:165, ry:36}
    ],
    associations: [
      ['kol','ke25'],['kol','ke26'],['kol','ke27'],['kol','ke21'],['kol','ke22'],['kol','ke23'],['kol','ke28'],['kol','ke29'],
      ['shop','ke25'],['shop','ke26'],['shop','ke27'],['shop','ke24'],['shop','ke28'],['shop','ke29'],['bank','ke24']
    ],
    relations: [ ['ke22','ke23','«include» ledger and tax'], ['ke24','ke22','«extend» approve request'] ]
  },
  {
    id: 'buyer', file: 'D06_BUYER_EXTERNAL_INTEGRATION', name: '06 - Buyer and External Integration',
    title: 'DETAILED USE CASE - BUYER & EXTERNAL INTEGRATION', subtitle: 'Public shopping flow and order intake from external channels',
    actors: [
      { id:'buyer', label:['Buyer /','Guest'], side:'left', x:150, y:350 },
      { id:'ecom', label:['Shopee / TikTok Shop','/ Shopify'], side:'right', kind:'box', x:1450, y:210 },
      { id:'shop', label:['Shop','Manager'], side:'right', x:1450, y:470 },
      { id:'logistics', label:['Logistics','GHN / GHTK'], side:'right', kind:'box', x:1450, y:720 }
    ],
    useCases: [
      {id:'b13', fr:'FR-13', label:'Open referral and record attribution', cx:510, cy:170, rx:165, ry:36},
      {id:'b15', fr:'FR-15', label:'View product and creator review', cx:510, cy:270, rx:165, ry:36},
      {id:'b16', fr:'FR-16', label:'Guest checkout with coupon', cx:510, cy:370, rx:165, ry:36},
      {id:'b17', fr:'FR-17', label:'Track order by phone or code', cx:510, cy:470, rx:165, ry:36},
      {id:'b18', fr:'FR-18', label:'Submit rating and review', cx:510, cy:570, rx:165, ry:36},
      {id:'b19', fr:'FR-19', label:'Receive marketplace webhook', cx:960, cy:250, rx:160, ry:36},
      {id:'b20', fr:'FR-20', label:'Create or import manual orders', cx:1140, cy:390, rx:160, ry:36},
      {id:'b21', fr:'FR-21', label:'Calculate commission per item', cx:960, cy:530, rx:160, ry:36},
      {id:'bship', fr:'EXT', label:'Synchronize shipment status', cx:1140, cy:670, rx:160, ry:36}
    ],
    associations: [
      ['buyer','b13'],['buyer','b15'],['buyer','b16'],['buyer','b17'],['buyer','b18'],
      ['ecom','b19'],['shop','b20'],['logistics','bship']
    ],
    relations: [ ['b13','b15','«include» landing page'], ['b16','b21','«include» commission'], ['b19','b21','«include» commission'], ['b17','bship','«include» delivery status'] ]
  }
];

function graphModel(page) {
  const cells = [];
  cells.push(vertex(`${page.id}-title`, `<b>${page.title}</b><br><font style="font-size:13px">${page.subtitle}</font>`, 250, 18, 1100, 62, 'rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#FFFFFF;fontColor=#111111;fontFamily=Arial;fontSize=23;'));
  cells.push(vertex(`${page.id}-boundary`, '<b>SCANMS SYSTEM BOUNDARY</b>', 290, 100, 1020, 740, 'shape=swimlane;startSize=36;horizontal=1;rounded=0;whiteSpace=wrap;html=1;fillColor=#FAFAFA;swimlaneFillColor=#FFFFFF;strokeColor=#202020;strokeWidth=1.5;fontColor=#111111;fontFamily=Arial;fontSize=15;'));
  for (const actor of page.actors) {
    const x = actor.x - (actor.kind === 'box' ? 105 : 90);
    const y = actor.y;
    const w = actor.kind === 'box' ? 210 : 180;
    const h = actor.kind === 'box' ? 65 : 120;
    const value = `<b>${actor.label.join('<br>')}</b>`;
    cells.push(vertex(`${page.id}-${actor.id}`, value, x, y, w, h, actor.kind === 'box' ? boxStyle : actorStyle));
  }
  for (const uc of page.useCases) {
    cells.push(vertex(`${page.id}-${uc.id}`, `<b>${uc.fr}</b><br>${uc.label}`, uc.cx-uc.rx, uc.cy-uc.ry, uc.rx*2, uc.ry*2, useCaseStyle));
  }
  page.associations.forEach(([a,u], i) => cells.push(edge(`${page.id}-a${i}`, `${page.id}-${a}`, `${page.id}-${u}`)));
  page.relations.forEach(([s,t,label], i) => cells.push(edge(`${page.id}-r${i}`, `${page.id}-${s}`, `${page.id}-${t}`, label, relationStyle)));
  return `<mxGraphModel dx="1600" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1600" pageHeight="900" background="#FFFFFF" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells.join('')}</root></mxGraphModel>`;
}

const drawio = `<?xml version="1.0" encoding="UTF-8"?><mxfile host="app.diagrams.net" modified="2026-09-17T00:00:00.000Z" agent="Codex" version="24.7.17" type="device" compressed="false" pages="${pages.length}">${pages.map(p=>`<diagram id="${p.id}" name="${xmlEsc(p.name)}">${graphModel(p)}</diagram>`).join('')}</mxfile>`;
fs.writeFileSync(path.join(outDir, 'SCANMS_DETAILED_USE_CASES.drawio'), drawio, 'utf8');

function svgText(x, y, lines, {size=14, weight=400, anchor='middle', gap=18, color='#111111'} = {}) {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${lines.map((line,i)=>`<tspan x="${x}" dy="${i===0?0:gap}">${xmlEsc(line)}</tspan>`).join('')}</text>`;
}

function actorSvg(actor) {
  if (actor.kind === 'box') {
    const x=actor.x-105, y=actor.y;
    return `<rect x="${x}" y="${y}" width="210" height="65" fill="#FFFFFF" stroke="#202020" stroke-width="1.5"/>${svgText(actor.x,y+27,actor.label,{size:13,weight:600,gap:17})}`;
  }
  const cx=actor.x, y=actor.y;
  return `<g stroke="#202020" stroke-width="2" fill="none"><circle cx="${cx}" cy="${y+22}" r="18"/><path d="M${cx} ${y+40}v42 M${cx-30} ${y+58}h60 M${cx} ${y+82}l-27 36 M${cx} ${y+82}l27 36"/></g>${svgText(cx,y+144,actor.label,{size:14,weight:600,gap:18})}`;
}

function actorHub(actor) {
  if (actor.kind === 'box') return { x: actor.side === 'left' ? actor.x+105 : actor.x-105, y: actor.y+32 };
  return { x: actor.side === 'left' ? actor.x+30 : actor.x-30, y: actor.y+58 };
}

function useCaseEndpoint(actor, uc) {
  return { x: actor.side === 'left' ? uc.cx-uc.rx : uc.cx+uc.rx, y: uc.cy };
}

function renderSvg(page, pageNumber) {
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900"><defs><marker id="openArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1 L9 5 L1 9" fill="none" stroke="#202020" stroke-width="1.5"/></marker></defs><rect width="1600" height="900" fill="#FFFFFF"/>`;
  s += svgText(800,48,[page.title],{size:25,weight:700});
  s += svgText(800,76,[page.subtitle],{size:14,color:'#444444'});
  s += `<line x1="70" y1="94" x2="1530" y2="94" stroke="#D0D0D0"/><rect x="290" y="100" width="1020" height="740" fill="#FAFAFA" stroke="#202020" stroke-width="1.5"/>`;
  s += svgText(800,127,['SCANMS SYSTEM BOUNDARY'],{size:15,weight:700});

  const actorMap = Object.fromEntries(page.actors.map(a=>[a.id,a]));
  const ucMap = Object.fromEntries(page.useCases.map(u=>[u.id,u]));
  for (const [actorId, ucId] of page.associations) {
    const actor=actorMap[actorId], uc=ucMap[ucId], start=actorHub(actor), end=useCaseEndpoint(actor,uc);
    s += `<path d="M${start.x} ${start.y} L${end.x} ${end.y}" fill="none" stroke="#202020" stroke-width="1.3"/>`;
  }

  for (const uc of page.useCases) {
    s += `<ellipse cx="${uc.cx}" cy="${uc.cy}" rx="${uc.rx}" ry="${uc.ry}" fill="#FFFFFF" stroke="#202020" stroke-width="1.5"/>`;
    s += svgText(uc.cx,uc.cy-4,[uc.fr],{size:12,weight:700});
    s += svgText(uc.cx,uc.cy+15,[uc.label],{size:12});
  }

  for (const [sourceId,targetId,label] of page.relations) {
    const source=ucMap[sourceId], target=ucMap[targetId];
    const dx=target.cx-source.cx, dy=target.cy-source.cy;
    const len=Math.max(1,Math.hypot(dx,dy));
    const sx=source.cx+(dx/len)*source.rx, sy=source.cy+(dy/len)*source.ry;
    const tx=target.cx-(dx/len)*target.rx, ty=target.cy-(dy/len)*target.ry;
    const mx=(sx+tx)/2, my=(sy+ty)/2;
    s += `<path d="M${sx.toFixed(1)} ${sy.toFixed(1)} L${tx.toFixed(1)} ${ty.toFixed(1)}" fill="none" stroke="#202020" stroke-width="1.3" stroke-dasharray="7 5" marker-end="url(#openArrow)"/>`;
    s += `<rect x="${mx-85}" y="${my-14}" width="170" height="22" fill="#FFFFFF"/>${svgText(mx,my+2,[label],{size:10,color:'#333333'})}`;
  }

  for (const actor of page.actors) s += actorSvg(actor);
  s += svgText(1525,875,[`SCANMS - Detailed Use Cases - ${pageNumber}/${pages.length}`],{size:11,anchor:'end',color:'#666666'});
  s += '</svg>';
  return s;
}

pages.forEach((page,index)=>fs.writeFileSync(path.join(outDir,`${page.file}.svg`),renderSvg(page,index+1),'utf8'));

const readme = `# SCANMS Detailed Use Case Pack\n\n- \`SCANMS_DETAILED_USE_CASES.drawio\`: six editable Draw.io pages.\n- D01: System Administrator and System Manager.\n- D02: Shop catalog and order operations.\n- D03: Shop finance and partner engagement.\n- D04: Collaborator onboarding and promotion.\n- D05: Collaborator earnings and engagement.\n- D06: Buyer and external integrations, including Shopee.\n\nThe diagrams use the canonical FR-01 to FR-32 baseline from \`docs/4_PERSON_TEAM_EXECUTION_GUIDE.md\` and the four authenticated roles from \`backend/prisma/schema.prisma\`. Repeated actor symbols represent the same actor and are used to keep associations readable.\n`;
fs.writeFileSync(path.join(outDir,'README.md'),readme,'utf8');

console.log(`Generated ${pages.length} detailed Draw.io pages and SVG exports in ${outDir}`);
