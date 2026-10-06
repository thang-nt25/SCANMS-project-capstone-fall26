const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const htmlPath = path.join(__dirname, '4_MAIN_FLOWS_PRESENTATION.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// Extract the global defs
const globalDefsMatch = html.match(/<!-- GLOBAL PERSISTENT SVG DEFS[\s\S]*?<defs>([\s\S]*?)<\/defs>\s*<\/svg>/);
const globalDefs = globalDefsMatch ? globalDefsMatch[1] : '';

// Slide configs
const slides = [
  {
    id: 'slide-1',
    name: 'SCANMS_Flow_1_Shop_KOL_Collaboration.png',
    title: 'Flow 1: Shop & KOL Collaboration'
  },
  {
    id: 'slide-2',
    name: 'SCANMS_Flow_2_Marketing_Order_Attribution.png',
    title: 'Flow 2: Marketing & Purchase Attribution'
  },
  {
    id: 'slide-3',
    name: 'SCANMS_Flow_3_Commission_Escrow_Dispute.png',
    title: 'Flow 3: Commission Escrow & Dispute Resolution'
  },
  {
    id: 'slide-4',
    name: 'SCANMS_Flow_4_Multi_Store_Withdrawal.png',
    title: 'Flow 4: Multi-Store Withdrawal & Reconciliation'
  }
];

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

slides.forEach((slide, index) => {
  // Extract SVG content for this slide
  const slideRegex = new RegExp(`<div class="slide-viewport" id="${slide.id}"[^>]*>[\\s\\S]*?<svg class="slide-svg" viewBox="0 0 1280 720"[^>]*>([\\s\\S]*?)<\\/svg>\\s*<\\/div>`);
  const match = html.match(slideRegex);
  if (!match) {
    console.error(`Could not find SVG content for ${slide.id}`);
    return;
  }

  const svgInner = match[1];

  // Create standalone HTML with embedded global defs inside the SVG
  const standaloneHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 2560px;
      height: 1440px;
      overflow: hidden;
      background: #FFFFFF;
      font-family: 'Montserrat', sans-serif;
    }
    svg {
      width: 2560px;
      height: 1440px;
      display: block;
    }
  </style>
</head>
<body>
  <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
    <defs>
      ${globalDefs}
    </defs>
    ${svgInner}
  </svg>
</body>
</html>`;

  const tempHtmlPath = path.join(__dirname, `_temp_${slide.id}.html`);
  const outPngPath = path.join(__dirname, slide.name);

  fs.writeFileSync(tempHtmlPath, standaloneHtml, 'utf8');

  console.log(`Rendering ${slide.title} to 2560x1440 PNG...`);
  try {
    const cmd = `"${chromePath}" --headless=new --disable-gpu --window-size=2560,1440 --virtual-time-budget=2500 --screenshot="${outPngPath}" "file:///${tempHtmlPath.replace(/\\\\/g, '/')}"`;
    execSync(cmd, { stdio: 'inherit' });
    console.log(`Successfully generated: ${slide.name}`);
  } catch (err) {
    console.error(`Failed to export ${slide.name}:`, err.message);
  } finally {
    try { fs.unlinkSync(tempHtmlPath); } catch(e) {}
  }
});

console.log('All slides exported successfully!');
