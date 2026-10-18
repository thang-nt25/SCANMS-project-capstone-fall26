const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REVIEW2_DIR = path.join(__dirname, '..', 'docs', 'review 2');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const files = [
  { file: 'SCANMS_SM_01_Order_Lifecycle.svg', name: '1. Order Lifecycle', id: 'sm01' },
  { file: 'SCANMS_SM_02_Return_Refund_Dispute_Lifecycle.svg', name: '2. Return & Dispute', id: 'sm02' },
  { file: 'SCANMS_SM_03_Commission_Payout_Lifecycle.svg', name: '3. Commission & Payout', id: 'sm03' },
  { file: 'SCANMS_SM_04_KOL_Sample_Request_Lifecycle.svg', name: '4. KOL Sample Request', id: 'sm04' },
  { file: 'SCANMS_SM_05_Product_Moderation_Lifecycle.svg', name: '5. Product Moderation', id: 'sm05' },
  { file: 'SCANMS_SM_06_KYC_Verification_Lifecycle.svg', name: '6. KYC Verification', id: 'sm06' }
];

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function parseSM(filename) {
  const content = fs.readFileSync(path.join(REVIEW2_DIR, filename), 'utf8');

  // Start & End
  const startM = content.match(/<circle cx="(\d+)" cy="(\d+)" r="14"/);
  const start = startM ? { cx: Number(startM[1]), cy: Number(startM[2]) } : null;
  const endM = content.match(/<circle cx="(\d+)" cy="(\d+)" r="15"/);
  const end = endM ? { cx: Number(endM[1]), cy: Number(endM[2]) } : null;

  // States
  const stateRegex = /<g id="state-([^"]+)">[\s\S]*?<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"[^>]*\/>[\s\S]*?<text[^>]*font-size="14\.5"[^>]*>([^<]+)<\/text>[\s\S]*?<text[^>]*font-size="11\.5"[^>]*>([^<]+)<\/text>/g;
  const states = [];
  let sMatch;
  while ((sMatch = stateRegex.exec(content)) !== null) {
    states.push({
      id: sMatch[1],
      x: Number(sMatch[2]),
      y: Number(sMatch[3]),
      w: Number(sMatch[4]),
      h: Number(sMatch[5]),
      title: sMatch[6],
      sub: sMatch[7]
    });
  }

  // Transitions
  const transSection = (content.match(/<!-- Transitions -->([\s\S]*?)<!-- States -->/) || [])[1] || '';
  const pathBlocks = transSection.split(/(?=<path )/g).filter(x => x.trim().startsWith('<path'));
  const transitions = [];

  const allStateBoxes = [...states];
  if (start) allStateBoxes.push({ id: 'start', x: start.cx - 14, y: start.cy - 14, w: 28, h: 28, title: 'Start' });
  if (end) allStateBoxes.push({ id: 'end', x: end.cx - 15, y: end.cy - 15, w: 30, h: 30, title: 'End' });

  function findNearest(pt) {
    let best = null;
    let minDist = 999999;
    allStateBoxes.forEach(s => {
      const nearX = Math.max(s.x, Math.min(pt.x, s.x + s.w));
      const nearY = Math.max(s.y, Math.min(pt.y, s.y + s.h));
      const dist = Math.hypot(pt.x - nearX, pt.y - nearY);
      if (dist < minDist) {
        minDist = dist;
        best = s;
      }
    });
    return { state: best, dist: minDist };
  }

  pathBlocks.forEach((b, idx) => {
    const d = (b.match(/d="([^"]+)"/) || [])[1] || '';
    const isDashed = b.includes('stroke-dasharray');
    const trigger = (b.match(/font-weight="700"[^>]*>([^<]+)<\/tspan>/) || [])[1] || '';
    const guard = (b.match(/font-style="italic"[^>]*>([^<]+)<\/tspan>/) || [])[1] || '';
    const action = (b.match(/font-weight="600"[^>]*>([^<]+)<\/tspan>/) || [])[1] || '';
    const raw = b.replace(/<path[^>]*\/>/g, '').replace(/<\/?[^>]+(>|$)/g, ' ').replace(/\s+/g, ' ').trim();

    const textM = b.match(/<text x="(\d+)" y="(\d+)"[^>]*>([\s\S]*?)<\/text>/);
    const tx = textM ? Number(textM[1]) : 0;
    const ty = textM ? Number(textM[2]) : 0;
    const textInner = textM ? textM[3].trim() : '';

    const coords = Array.from(d.matchAll(/([ML])\s*(\d+)\s*(\d+)/g)).map(m => ({ x: Number(m[2]), y: Number(m[3]) }));
    let src = null;
    let tgt = null;
    if (coords.length >= 2) {
      src = findNearest(coords[0]).state;
      tgt = findNearest(coords[coords.length - 1]).state;
    }

    transitions.push({
      id: `tr_${idx + 1}`,
      d,
      isDashed,
      trigger,
      guard,
      action,
      raw,
      tx,
      ty,
      textInner,
      hasText: !!textM,
      coords,
      srcId: src ? src.id : null,
      tgtId: tgt ? tgt.id : null
    });
  });

  // Calculate tight bounding box for the middle state machine only
  let minX = 9999, minY = 9999, maxX = 0, maxY = 0;
  if (start) {
    minX = Math.min(minX, start.cx - 20);
    minY = Math.min(minY, start.cy - 20);
    maxX = Math.max(maxX, start.cx + 70);
    maxY = Math.max(maxY, start.cy + 20);
  }
  if (end) {
    minX = Math.min(minX, end.cx - 30);
    minY = Math.min(minY, end.cy - 30);
    maxX = Math.max(maxX, end.cx + 30);
    maxY = Math.max(maxY, end.cy + 40);
  }
  states.forEach(s => {
    minX = Math.min(minX, s.x);
    minY = Math.min(minY, s.y);
    maxX = Math.max(maxX, s.x + s.w);
    maxY = Math.max(maxY, s.y + s.h);
  });
  transitions.forEach(t => {
    t.coords.forEach(c => {
      minX = Math.min(minX, c.x);
      minY = Math.min(minY, c.y);
      maxX = Math.max(maxX, c.x);
      maxY = Math.max(maxY, c.y);
    });
    if (t.hasText) {
      const rawText = t.textInner.replace(/<\/?[^>]+(>|$)/g, '').trim();
      const textW = rawText.length * 7;
      minX = Math.min(minX, t.tx);
      minY = Math.min(minY, t.ty - 12);
      maxX = Math.max(maxX, t.tx + textW);
      maxY = Math.max(maxY, t.ty + 10);
    }
  });

  const pad = 40;
  const dx = minX - pad;
  const dy = minY - pad;
  const w = Math.ceil(maxX - dx + pad + 20);
  const h = Math.ceil(maxY - dy + pad + 20);

  return { start, end, states, transitions, dx, dy, w, h };
}

function buildDiagramXml(data, diagramId, diagramName) {
  const { dx, dy, w, h } = data;
  let cells = [];

  // Cell 0 & 1
  cells.push('<mxCell id="0"/>');
  cells.push('<mxCell id="1" parent="0"/>');

  // Start Node
  if (data.start) {
    const sx = data.start.cx - 14 - dx;
    const sy = data.start.cy - 14 - dy;
    cells.push(`
      <mxCell id="st_start" value="" style="ellipse;fillColor=#000000;strokeColor=#000000;" vertex="1" parent="1">
        <mxGeometry x="${sx}" y="${sy}" width="28" height="28" as="geometry"/>
      </mxCell>
      <mxCell id="lbl_start" value="&lt;b&gt;Start&lt;/b&gt;" style="text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=12;fontColor=#000000;fontFamily=Segoe UI, Roboto, sans-serif;" vertex="1" parent="1">
        <mxGeometry x="${sx + 32}" y="${sy + 2}" width="50" height="24" as="geometry"/>
      </mxCell>
    `);
  }

  // End Node
  if (data.end) {
    const ex = data.end.cx - 15 - dx;
    const ey = data.end.cy - 15 - dy;
    cells.push(`
      <mxCell id="st_end" value="" style="ellipse;shape=endState;fillColor=#000000;strokeColor=#000000;strokeWidth=2;" vertex="1" parent="1">
        <mxGeometry x="${ex}" y="${ey}" width="30" height="30" as="geometry"/>
      </mxCell>
      <mxCell id="lbl_end" value="&lt;b&gt;End&lt;/b&gt;" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=12;fontColor=#000000;fontFamily=Segoe UI, Roboto, sans-serif;" vertex="1" parent="1">
        <mxGeometry x="${ex - 10}" y="${ey + 33}" width="50" height="20" as="geometry"/>
      </mxCell>
    `);
  }

  // States
  data.states.forEach(s => {
    const sx = s.x - dx;
    const sy = s.y - dy;
    cells.push(`
      <mxCell id="st_${s.id}" value="&lt;b&gt;${escapeXml(s.title)}&lt;/b&gt;&lt;br&gt;&lt;font color=&quot;#555555&quot;&gt;&lt;small&gt;${escapeXml(s.sub)}&lt;/small&gt;&lt;/font&gt;" style="rounded=1;arcSize=14;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.8;fontColor=#000000;fontSize=13.5;fontFamily=Segoe UI, Roboto, sans-serif;" vertex="1" parent="1">
        <mxGeometry x="${sx}" y="${sy}" width="${s.w}" height="${s.h}" as="geometry"/>
      </mxCell>
    `);
  });

  // Transitions
  data.transitions.forEach((t, idx) => {
    let lblParts = [];
    if (t.trigger) lblParts.push(`&lt;b&gt;${escapeXml(t.trigger)}&lt;/b&gt;`);
    if (t.guard) lblParts.push(`&lt;i&gt;&lt;font color=&quot;#444444&quot;&gt;${escapeXml(t.guard)}&lt;/font&gt;&lt;/i&gt;`);
    if (t.action) lblParts.push(`&lt;b&gt;&lt;font color=&quot;#000000&quot;&gt;${escapeXml(t.action)}&lt;/font&gt;&lt;/b&gt;`);
    const lblVal = lblParts.join('&lt;br&gt;') || escapeXml(t.raw);

    const dashedStyle = t.isDashed ? 'dashed=1;dashPattern=5 5;' : '';
    const srcId = t.srcId ? `st_${t.srcId}` : '';
    const tgtId = t.tgtId ? `st_${t.tgtId}` : '';

    let ptsXml = '';
    if (t.coords.length > 2) {
      const intermediate = t.coords.slice(1, t.coords.length - 1);
      ptsXml = `<Array as="points">${intermediate.map(pt => `<mxPoint x="${pt.x - dx}" y="${pt.y - dy}"/>`).join('')}</Array>`;
    }

    if (srcId && tgtId) {
      cells.push(`
        <mxCell id="edge_${idx + 1}" value="${lblVal}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.6;fontColor=#000000;fontSize=10.5;labelBackgroundColor=#FFFFFF;fontFamily=Segoe UI, Roboto, sans-serif;${dashedStyle}" edge="1" source="${srcId}" target="${tgtId}" parent="1">
          <mxGeometry relative="1" as="geometry">
            ${ptsXml}
          </mxGeometry>
        </mxCell>
      `);
    } else {
      const pStart = t.coords[0];
      const pEnd = t.coords[t.coords.length - 1];
      cells.push(`
        <mxCell id="edge_${idx + 1}" value="${lblVal}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.6;fontColor=#000000;fontSize=10.5;labelBackgroundColor=#FFFFFF;fontFamily=Segoe UI, Roboto, sans-serif;${dashedStyle}" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="${pStart.x - dx}" y="${pStart.y - dy}" as="sourcePoint"/>
            <mxPoint x="${pEnd.x - dx}" y="${pEnd.y - dy}" as="targetPoint"/>
            ${ptsXml}
          </mxGeometry>
        </mxCell>
      `);
    }
  });

  return `  <diagram id="${diagramId}" name="${diagramName}">
    <mxGraphModel dx="${w + 80}" dy="${h + 80}" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${w}" pageHeight="${h}" math="0" shadow="0">
      <root>
        ${cells.join('\n')}
      </root>
    </mxGraphModel>
  </diagram>`;
}

function buildBwSvg(data) {
  const { dx, dy, w, h } = data;

  let startSvg = '';
  if (data.start) {
    const sx = data.start.cx - dx;
    const sy = data.start.cy - dy;
    startSvg = `
      <circle cx="${sx}" cy="${sy}" r="14" fill="#000000" />
      <text x="${sx + 24}" y="${sy + 5}" font-family="Segoe UI, Roboto, sans-serif" font-size="12" font-weight="700" fill="#000000">Start</text>
    `;
  }

  let endSvg = '';
  if (data.end) {
    const ex = data.end.cx - dx;
    const ey = data.end.cy - dy;
    endSvg = `
      <circle cx="${ex}" cy="${ey}" r="15" fill="#FFFFFF" stroke="#000000" stroke-width="2" />
      <circle cx="${ex}" cy="${ey}" r="8" fill="#000000" />
      <text x="${ex}" y="${ey + 30}" font-family="Segoe UI, Roboto, sans-serif" font-size="12" font-weight="700" fill="#000000" text-anchor="middle">End</text>
    `;
  }

  let statesSvg = data.states.map(s => {
    const sx = s.x - dx;
    const sy = s.y - dy;
    return `
      <g id="state-${s.id}">
        <rect x="${sx}" y="${sy}" width="${s.w}" height="${s.h}" rx="8" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
        <text x="${sx + s.w/2}" y="${sy + 25}" font-family="Segoe UI, Roboto, sans-serif" font-size="14.5" font-weight="700" fill="#000000" text-anchor="middle">${s.title}</text>
        <text x="${sx + s.w/2}" y="${sy + 44}" font-family="Segoe UI, Roboto, sans-serif" font-size="11.5" font-weight="500" fill="#555555" text-anchor="middle">${s.sub}</text>
      </g>
    `;
  }).join('\n');

  let transSvg = data.transitions.map(t => {
    const dashAttr = t.isDashed ? 'stroke-dasharray="5,5"' : '';
    const shiftedD = t.d.replace(/([ML])\s*(\d+)\s*(\d+)/g, (_, cmd, x, y) => `${cmd} ${Number(x) - dx} ${Number(y) - dy}`);
    let textSvg = '';
    if (t.hasText) {
      const tx = t.tx - dx;
      const ty = t.ty - dy;
      textSvg = `<text x="${tx}" y="${ty}" font-family="Segoe UI, Roboto, sans-serif" font-size="11" text-anchor="start">${t.textInner}</text>`;
    }
    return `
      <path d="${shiftedD}" fill="none" stroke="#000000" stroke-width="1.8" ${dashAttr} marker-end="url(#arrowhead)" />
      ${textSvg}
    `;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <defs>
    <marker id="arrowhead" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
      <polygon points="0 1, 8 4.5, 0 8" fill="#000000" />
    </marker>
  </defs>

  <!-- Clean Pure White Background -->
  <rect width="100%" height="100%" fill="#FFFFFF" />

  <!-- Start Node -->
  ${startSvg}

  <!-- End Node -->
  ${endSvg}

  <!-- Transitions -->
  ${transSvg}

  <!-- States -->
  ${statesSvg}
</svg>`;
}

function renderPng(svgPath, pngPath, width, height) {
  try {
    if (fs.existsSync(EDGE_PATH)) {
      const resolvedPng = path.resolve(pngPath);
      const resolvedSvg = path.resolve(svgPath);
      if (fs.existsSync(resolvedPng)) {
        fs.unlinkSync(resolvedPng);
      }
      const fileUrl = `file:///${resolvedSvg.replace(/\\/g, '/')}`;
      const cmd = `& "${EDGE_PATH}" --headless=new --disable-gpu --screenshot="${resolvedPng}" --window-size=${width},${height} "${fileUrl}"`;
      execSync(cmd, { shell: 'powershell.exe', stdio: 'ignore' });
      if (fs.existsSync(resolvedPng)) {
        console.log(`Rendered B&W PNG: ${path.basename(resolvedPng)} (${fs.statSync(resolvedPng).size} bytes, ${width}x${height})`);
      }
    }
  } catch (err) {
    console.warn(`PNG export warning for ${path.basename(pngPath)}:`, err.message);
  }
}

async function main() {
  console.log('=== CONVERTING REVIEW 2 STATE MACHINES TO DRAW.IO (PURE MIDDLE STATE MACHINE ONLY - B&W) ===');
  
  const allDiagramXmls = [];
  let firstData = null;

  for (const item of files) {
    console.log(`\nProcessing: ${item.file}...`);
    const data = parseSM(item.file);
    if (!firstData) firstData = data;
    const baseName = item.file.replace('.svg', '');

    console.log(`Bounds: ${data.w}x${data.h} (dx=${data.dx}, dy=${data.dy})`);

    // 1. Generate Diagram XML
    const diagramXml = buildDiagramXml(data, item.id, item.name);
    allDiagramXmls.push(diagramXml);

    const singleDrawioXml = `<mxfile host="Electron" modified="${new Date().toISOString()}" agent="SCANMS" version="21.0.0" type="device">
${diagramXml}
</mxfile>`;

    // 2. Save .drawio
    const drawioPath = path.join(REVIEW2_DIR, `${baseName}.drawio`);
    fs.writeFileSync(drawioPath, singleDrawioXml, 'utf8');
    console.log(`Saved: ${baseName}.drawio (${fs.statSync(drawioPath).size} bytes)`);

    // 3. Build Black & White SVG (Pure middle state machine only)
    const bwSvg = buildBwSvg(data);
    const svgPath = path.join(REVIEW2_DIR, `${baseName}.svg`);
    fs.writeFileSync(svgPath, bwSvg, 'utf8');
    console.log(`Saved B&W SVG: ${baseName}.svg (${fs.statSync(svgPath).size} bytes)`);

    // 4. Build .drawio.svg (Embed Draw.io XML into SVG content)
    const escapedXml = singleDrawioXml.replace(/"/g, '&quot;');
    const drawioSvg = bwSvg.replace('<svg ', `<svg content="${escapedXml}" `);
    const drawioSvgPath = path.join(REVIEW2_DIR, `${baseName}.drawio.svg`);
    fs.writeFileSync(drawioSvgPath, drawioSvg, 'utf8');
    console.log(`Saved Draw.io SVG: ${baseName}.drawio.svg (${fs.statSync(drawioSvgPath).size} bytes)`);

    // 5. Render PNG via Edge with exact state machine dimensions
    const pngPath = path.join(REVIEW2_DIR, `${baseName}.png`);
    renderPng(svgPath, pngPath, data.w, data.h);
  }

  // 6. Generate Master Combined Draw.io (All 6 tabs in one file)
  console.log('\n--- Building Master Combined Draw.io (All 6 State Machines) ---');
  const masterDrawioXml = `<mxfile host="Electron" modified="${new Date().toISOString()}" agent="SCANMS" version="21.0.0" type="device">
${allDiagramXmls.join('\n')}
</mxfile>`;

  const masterDrawioPath = path.join(REVIEW2_DIR, 'SCANMS_State_Machines_All.drawio');
  fs.writeFileSync(masterDrawioPath, masterDrawioXml, 'utf8');
  console.log(`Saved Master: SCANMS_State_Machines_All.drawio (${fs.statSync(masterDrawioPath).size} bytes)`);

  // Master drawio.svg using first diagram as preview
  const firstBwSvg = buildBwSvg(firstData);
  const escapedMasterXml = masterDrawioXml.replace(/"/g, '&quot;');
  const masterDrawioSvg = firstBwSvg.replace('<svg ', `<svg content="${escapedMasterXml}" `);
  const masterDrawioSvgPath = path.join(REVIEW2_DIR, 'SCANMS_State_Machines_All.drawio.svg');
  fs.writeFileSync(masterDrawioSvgPath, masterDrawioSvg, 'utf8');
  console.log(`Saved Master Draw.io SVG: SCANMS_State_Machines_All.drawio.svg (${fs.statSync(masterDrawioSvgPath).size} bytes)`);

  console.log('\n=== ALL STATE MACHINES SUCCESSFULLY UPDATED (PURE MIDDLE ONLY, MONOCHROME B&W) ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
