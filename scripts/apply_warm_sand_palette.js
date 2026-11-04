const fs = require('fs');

console.log('=== APPLYING UNIFIED WARM SAND & BRAND GOLD PALETTE ===');

// 1. index.css: Unified Warm Sand Canvas & Surfaces
let indexCss = fs.readFileSync('frontend/src/index.css', 'utf8');
indexCss = indexCss.replace('--color-canvas: #F5EFE6;', '--color-canvas: #FAF7F2;')
                   .replace('--canvas: #F5EFE6;', '--canvas: #FAF7F2;')
                   .replace('--color-surface-sand: #ECE5D8;', '--color-surface-sand: #ECE5D8;')
                   .replace('--surface-sand: #ECE5D8;', '--surface-sand: #ECE5D8;')
                   .replace('--color-line: #DFD6C5;', '--color-line: #DFD6C5;')
                   .replace('--line: #DFD6C5;', '--line: #DFD6C5;');
fs.writeFileSync('frontend/src/index.css', indexCss, 'utf8');
console.log('[1/8] index.css updated with #FAF7F2 canvas');

// 2. ScanMSLogo.tsx: Default to Warm Charcoal Ink Scan + Gold MS
let logoCode = fs.readFileSync('frontend/src/components/common/ScanMSLogo.tsx', 'utf8');
logoCode = logoCode.replace(
  "darkMode = false,",
  "darkMode = false,"
);
logoCode = logoCode.replace(
  "className={`font-black tracking-tight ${darkMode ? 'text-[#FAF8F5]' : 'text-[#1A1612]'} ${iconDimensions.textMain}`}",
  "className={`font-black tracking-tight text-[#1A1612] ${iconDimensions.textMain}`}"
);
logoCode = logoCode.replace(
  "className={`scanms-logo-subtitle ${darkMode ? 'text-[#C4B499]' : 'text-[#7D715E]'} font-bold uppercase tracking-widest mt-1 ${iconDimensions.textSub}`}",
  "className={`scanms-logo-subtitle text-[#7D715E] font-bold uppercase tracking-widest mt-1 ${iconDimensions.textSub}`}"
);
fs.writeFileSync('frontend/src/components/common/ScanMSLogo.tsx', logoCode, 'utf8');
console.log('[2/8] ScanMSLogo.tsx updated to warm ink branding');

// 3. HeaderAccountButton.tsx: Default to Light Warm Sand
let acctBtn = fs.readFileSync('frontend/src/components/layout/HeaderAccountButton.tsx', 'utf8');
acctBtn = acctBtn.replace(
  'darkMode = true,',
  'darkMode = false,'
);
fs.writeFileSync('frontend/src/components/layout/HeaderAccountButton.tsx', acctBtn, 'utf8');
console.log('[3/8] HeaderAccountButton.tsx set to darkMode = false');

// 4. ProductSearchBox.tsx: Clean White search input with Warm Sand border & Brand Gold button
let searchBox = fs.readFileSync('frontend/src/components/layout/ProductSearchBox.tsx', 'utf8');
searchBox = searchBox.replace(
  "darkMode = true",
  "darkMode = false"
);
// Make search box look elegant on #ECE5D8: White background, warm border #DFD6C5, Gold button
searchBox = searchBox.replace(
  'border-[#EAE4D7] bg-white',
  'border-[#DFD6C5] bg-white shadow-xs'
);
fs.writeFileSync('frontend/src/components/layout/ProductSearchBox.tsx', searchBox, 'utf8');
console.log('[4/8] ProductSearchBox.tsx set to clean white on warm sand');

// 5. PublicHeader.tsx: Warm Sand Header (#ECE5D8) + 2px Gold bottom accent line (#C59B58)
let pubHeader = fs.readFileSync('frontend/src/components/layout/PublicHeader.tsx', 'utf8');
pubHeader = pubHeader.replace(
  'z-40 bg-[#231D15] border-b border-[#382F22] shadow-[0_4px_20px_rgba(0,0,0,0.30)] text-[#FAF8F5]',
  'z-40 bg-[#ECE5D8] border-b-2 border-[#C59B58] shadow-[0_2px_12px_rgba(35,29,21,0.06)] text-[#1A1612]'
);
pubHeader = pubHeader.replace(
  'darkMode={true}',
  'darkMode={false}'
);
pubHeader = pubHeader.replace(
  'bg-[#231D15] relative z-10 border-t border-[#382F22]',
  'bg-[#ECE5D8] relative z-10 border-t border-[#DFD6C5]'
);
// Guest login button: Warm Gold button
pubHeader = pubHeader.replace(
  'text-xs font-bold text-[#1A1612] bg-[#C59B58] border border-[#C59B58] hover:bg-[#A87D38] shadow-sm',
  'text-xs font-bold text-[#1A1612] bg-[#C59B58] border border-[#B88E4F] hover:bg-[#B88E4F] shadow-sm'
);
fs.writeFileSync('frontend/src/components/layout/PublicHeader.tsx', pubHeader, 'utf8');
console.log('[5/8] PublicHeader.tsx updated to #ECE5D8 with #C59B58 bottom bar');

// 6. PublicHeader.css & MarketplaceHeader.tsx
let pubCss = fs.readFileSync('frontend/src/components/layout/PublicHeader.css', 'utf8');
pubCss = pubCss.replace(
  '.public-commerce-header--marketplace { @apply [background:#231D15]!; }',
  '.public-commerce-header--marketplace { @apply [background:#ECE5D8]!; }'
);
pubCss = pubCss.replace(
  '@apply [color:#FAF8F5];',
  '@apply [color:#1A1612];'
);
pubCss = pubCss.replace(
  '@apply [background:#2E271E];',
  '@apply [background:#E2D9C8];'
);
pubCss = pubCss.replace(
  '@apply [border-inline:1px_solid_#382F22];',
  '@apply [border-inline:1px_solid_#DFD6C5];'
);
pubCss = pubCss.replace(
  '@apply [color:#C4B499];',
  '@apply [color:#7D715E];'
);
fs.writeFileSync('frontend/src/components/layout/PublicHeader.css', pubCss, 'utf8');

let mpHeader = fs.readFileSync('frontend/src/components/marketplace/MarketplaceHeader.tsx', 'utf8');
mpHeader = mpHeader.replace(
  'className="marketplace-header sticky top-0 z-40 bg-[#231D15] border-b border-[#382F22] shadow-[0_4px_24px_rgba(0,0,0,0.30)]"',
  'className="marketplace-header sticky top-0 z-40 bg-[#ECE5D8] border-b-2 border-[#C59B58] shadow-[0_2px_12px_rgba(35,29,21,0.06)]"'
);
fs.writeFileSync('frontend/src/components/marketplace/MarketplaceHeader.tsx', mpHeader, 'utf8');
console.log('[6/8] PublicHeader.css & MarketplaceHeader.tsx updated');

// 7. MarketplaceShortcuts.css: Seamless Warm Sand (#E2D9C8) with Gold indicator
let scCss = fs.readFileSync('frontend/src/components/marketplace/MarketplaceShortcuts.css', 'utf8');
scCss = scCss.replace(
  '.marketplace-shortcuts { @apply [border-bottom:1px_solid_#382F22]!; @apply [background:#1D1711]!; }',
  '.marketplace-shortcuts { @apply [border-bottom:1px_solid_#DFD6C5]!; @apply [background:#E2D9C8]!; }'
);
scCss = scCss.replace(
  '@apply [color:#C4B499]!;',
  '@apply [color:#6B5E4B]!;'
);
scCss = scCss.replace(
  '.marketplace-shortcuts__item:hover { @apply [color:#FAF8F5]!; }',
  '.marketplace-shortcuts__item:hover { @apply [color:#1A1612]!; }'
);
scCss = scCss.replace(
  '.marketplace-shortcuts__item[aria-current] { @apply [color:#DEBE85]!; @apply [font-weight:650]; }',
  '.marketplace-shortcuts__item[aria-current] { @apply [color:#8C6226]!; @apply [font-weight:700]; }'
);
fs.writeFileSync('frontend/src/components/marketplace/MarketplaceShortcuts.css', scCss, 'utf8');

// 8. CategoryQuickNav.css: Break up the sea of white with Warm Sand panel & card hierarchy
let catCss = fs.readFileSync('frontend/src/components/marketplace/CategoryQuickNav.css', 'utf8');
catCss = catCss.replace(
  '.category-quick-nav { @apply [padding:20px_0]; @apply [background:#faf8f5]; @apply [color:#1a1612]; }',
  '.category-quick-nav { @apply [padding:24px_0]; @apply [background:#FAF7F2]; @apply [color:#1a1612]; }'
);
catCss = catCss.replace(
  '.category-quick-nav__panel { @apply overflow-hidden; @apply [border:1px_solid_#eae4d7]; @apply [border-radius:4px]; @apply [background:#fff]; }',
  '.category-quick-nav__panel { @apply overflow-hidden; @apply [border:1px_solid_#DFD6C5]; @apply [border-radius:18px]; @apply [background:#FAF7F2]; @apply [box-shadow:0_4px_16px_rgba(35,29,21,0.04)]; }'
);
catCss = catCss.replace(
  '.category-quick-nav__heading { @apply flex; @apply items-center; @apply justify-between; @apply [gap:16px]; @apply [padding:14px_20px]; @apply [border-bottom:1px_solid_#eae4d7]; }',
  '.category-quick-nav__heading { @apply flex; @apply items-center; @apply justify-between; @apply [gap:16px]; @apply [padding:14px_22px]; @apply [background:#F2ECE1]; @apply [border-bottom:1px_solid_#DFD6C5]; }'
);
catCss = catCss.replace(
  '.category-quick-nav__heading h2 { @apply [margin:0]; @apply [color:#7d715e]; @apply [font-size:16px]; @apply [font-weight:500]; @apply [line-height:1.4]; @apply uppercase; }',
  '.category-quick-nav__heading h2 { @apply [margin:0]; @apply [color:#1A1612]; @apply [font-size:15px]; @apply [font-weight:700]; @apply [line-height:1.4]; @apply uppercase; @apply [letter-spacing:0.04em]; }'
);
catCss = catCss.replace(
  '.category-quick-nav__categories { @apply grid; @apply [grid-template-columns:repeat(8,_minmax(0,_1fr))]; @apply [background:#fff]; }',
  '.category-quick-nav__categories { @apply grid; @apply [grid-template-columns:repeat(8,_minmax(0,_1fr))]; @apply [background:#FAF7F2]; }'
);
catCss = catCss.replace(
  '.category-quick-nav__category { @apply flex; @apply flex-col; @apply items-center; @apply justify-start; @apply [gap:12px]; @apply [min-width:0]; @apply [min-height:160px]; @apply [padding:18px_10px_14px]; @apply [border-right:1px_solid_#f0ebe3]; @apply [border-bottom:1px_solid_#f0ebe3]; @apply [background:#fff]; @apply text-center; @apply [color:#1a1612]; @apply [text-decoration:none]; @apply [transition:background-color_150ms_ease]; }',
  '.category-quick-nav__category { @apply flex; @apply flex-col; @apply items-center; @apply justify-start; @apply [gap:12px]; @apply [min-width:0]; @apply [min-height:160px]; @apply [padding:18px_10px_14px]; @apply [border-right:1px_solid_#EAE4D7]; @apply [border-bottom:1px_solid_#EAE4D7]; @apply [background:#FAF7F2]; @apply text-center; @apply [color:#1a1612]; @apply [text-decoration:none]; @apply [transition:all_150ms_ease]; }'
);
catCss = catCss.replace(
  '.category-quick-nav__image { @apply grid; @apply [flex:0_0_auto]; @apply place-items-center; @apply [width:82px]; @apply [height:82px]; @apply overflow-hidden; @apply [border-radius:50%]; @apply [background:#f5f5f5]; }',
  '.category-quick-nav__image { @apply grid; @apply [flex:0_0_auto]; @apply place-items-center; @apply [width:82px]; @apply [height:82px]; @apply overflow-hidden; @apply [border-radius:50%]; @apply [background:#F2ECE1]; @apply [border:1px_solid_#DFD6C5]; }'
);
fs.writeFileSync('frontend/src/components/marketplace/CategoryQuickNav.css', catCss, 'utf8');

// 9. Topbar.tsx: Workspace Header to Warm Sand
let topbar = fs.readFileSync('frontend/src/components/layout/Topbar.tsx', 'utf8');
topbar = topbar.replace(
  'className="scanms-site-header workspace-topbar sticky top-0 z-40 bg-[#231D15]/95 backdrop-blur-md border-b border-[#382F22] shadow-md text-[#FAF8F5]"',
  'className="scanms-site-header workspace-topbar sticky top-0 z-40 bg-[#ECE5D8]/95 backdrop-blur-md border-b-2 border-[#C59B58] shadow-sm text-[#1A1612]"'
);
topbar = topbar.replace(
  '<ScanMSLogo size="md" darkMode={true} className="scanms-header-logo" />',
  '<ScanMSLogo size="md" darkMode={false} className="scanms-header-logo" />'
);
fs.writeFileSync('frontend/src/components/layout/Topbar.tsx', topbar, 'utf8');

console.log('[7/8 & 8/8] Shortcuts & CategoryQuickNav.css updated');
console.log('=== UNIFIED WARM SAND PALETTE APPLIED SUCCESSFULLY ===');
