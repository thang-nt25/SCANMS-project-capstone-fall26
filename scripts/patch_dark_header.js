const fs = require('fs');

// 1. Patch MarketplaceHeader.tsx
let mpHeader = fs.readFileSync('frontend/src/components/marketplace/MarketplaceHeader.tsx', 'utf8');
mpHeader = mpHeader.replace(
  'className="marketplace-header sticky top-0 z-40 bg-white shadow-[0_2px_8px_rgb(35_29_21/4%)]"',
  'className="marketplace-header sticky top-0 z-40 bg-[#231D15] border-b border-[#382F22] shadow-[0_4px_24px_rgba(0,0,0,0.30)]"'
);
fs.writeFileSync('frontend/src/components/marketplace/MarketplaceHeader.tsx', mpHeader, 'utf8');
console.log('MarketplaceHeader.tsx updated with #231D15');

// 2. Patch PublicHeader.tsx
let pubHeader = fs.readFileSync('frontend/src/components/layout/PublicHeader.tsx', 'utf8');
pubHeader = pubHeader.replace(
  'z-40 bg-white border-b border-[#EAE4D7]',
  'z-40 bg-[#231D15] border-b border-[#382F22] shadow-[0_4px_20px_rgba(0,0,0,0.30)] text-[#FAF8F5]'
);
pubHeader = pubHeader.replace(
  '<ScanMSLogo size="md" className="scanms-header-logo',
  '<ScanMSLogo size="md" darkMode={true} className="scanms-header-logo'
);
pubHeader = pubHeader.replace(
  'bg-[#FFFEFC] relative z-10',
  'bg-[#231D15] relative z-10 border-t border-[#382F22]'
);
// Guest login button
pubHeader = pubHeader.replace(
  'text-xs font-bold text-[#1A1612] bg-[#FBF5EB] border border-[#EEDFC6] hover:bg-[#F3EFE6] hover:border-[#C59B58]',
  'text-xs font-bold text-[#1A1612] bg-[#C59B58] border border-[#C59B58] hover:bg-[#A87D38] shadow-sm'
);
fs.writeFileSync('frontend/src/components/layout/PublicHeader.tsx', pubHeader, 'utf8');
console.log('PublicHeader.tsx updated with #231D15');

// 3. Patch PublicHeader.css
let pubCss = fs.readFileSync('frontend/src/components/layout/PublicHeader.css', 'utf8');
pubCss = pubCss.replace(
  '.public-commerce-header--marketplace { @apply [background:#fff]; }',
  '.public-commerce-header--marketplace { @apply [background:#231D15]!; }'
);
pubCss = pubCss.replace(
  '.public-commerce-header__tracking, .public-commerce-header__cart { @apply inline-flex; @apply [height:40px]; @apply [flex:0_0_auto]; @apply items-center; @apply justify-center; @apply [border:0]; @apply [border-radius:9px]; @apply [background:transparent]; @apply [color:#1a1612]; @apply cursor-pointer; }',
  '.public-commerce-header__tracking, .public-commerce-header__cart { @apply inline-flex; @apply [height:40px]; @apply [flex:0_0_auto]; @apply items-center; @apply justify-center; @apply [border:0]; @apply [border-radius:9px]; @apply [background:transparent]; @apply [color:#FAF8F5]; @apply cursor-pointer; }'
);
pubCss = pubCss.replace(
  '.public-commerce-header__tracking:hover, .public-commerce-header__cart:hover { @apply [background:#fbf5eb]; }',
  '.public-commerce-header__tracking:hover, .public-commerce-header__cart:hover { @apply [background:#2E271E]; }'
);
pubCss = pubCss.replace(
  '@apply [border-inline:1px_solid_#eae4d7];',
  '@apply [border-inline:1px_solid_#382F22];'
);
pubCss = pubCss.replace(
  '@apply [color:#7d715e];',
  '@apply [color:#C4B499];'
);
fs.writeFileSync('frontend/src/components/layout/PublicHeader.css', pubCss, 'utf8');
console.log('PublicHeader.css updated with #231D15');

// 4. Patch MarketplaceShortcuts.css
let scCss = fs.readFileSync('frontend/src/components/marketplace/MarketplaceShortcuts.css', 'utf8');
scCss = scCss.replace(
  '.marketplace-shortcuts { @apply [border-bottom:1px_solid_#eae4d7]; @apply [background:#fff]; }',
  '.marketplace-shortcuts { @apply [border-bottom:1px_solid_#382F22]!; @apply [background:#1D1711]!; }'
);
scCss = scCss.replace(
  '@apply [color:#7d715e];',
  '@apply [color:#C4B499];'
);
scCss = scCss.replace(
  '.marketplace-shortcuts__item:hover { @apply [color:#1a1612]; }',
  '.marketplace-shortcuts__item:hover { @apply [color:#FAF8F5]; }'
);
scCss = scCss.replace(
  '.marketplace-shortcuts__item[aria-current] { @apply [color:#8c6226]; @apply [font-weight:650]; }',
  '.marketplace-shortcuts__item[aria-current] { @apply [color:#DEBE85]; @apply [font-weight:650]; }'
);
scCss = scCss.replace(
  '@apply [background:#b88e4f];',
  '@apply [background:#C59B58];'
);
fs.writeFileSync('frontend/src/components/marketplace/MarketplaceShortcuts.css', scCss, 'utf8');
console.log('MarketplaceShortcuts.css updated');

// 5. Patch Topbar.tsx
let topbar = fs.readFileSync('frontend/src/components/layout/Topbar.tsx', 'utf8');
topbar = topbar.replace(
  'className="scanms-site-header workspace-topbar sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EAE4D7] shadow-2xs"',
  'className="scanms-site-header workspace-topbar sticky top-0 z-40 bg-[#231D15]/95 backdrop-blur-md border-b border-[#382F22] shadow-md text-[#FAF8F5]"'
);
topbar = topbar.replace(
  '<ScanMSLogo size="md" className="scanms-header-logo" />',
  '<ScanMSLogo size="md" darkMode={true} className="scanms-header-logo" />'
);
fs.writeFileSync('frontend/src/components/layout/Topbar.tsx', topbar, 'utf8');
console.log('Topbar.tsx updated with #231D15');
