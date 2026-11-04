const fs = require('fs');

// 1. Refine ScanMSLogo.tsx for high contrast on #C49B5B header
let logo = fs.readFileSync('frontend/src/components/common/ScanMSLogo.tsx', 'utf8');
logo = logo.replace(
  'className={`font-black italic text-transparent bg-clip-text bg-gradient-to-r from-[#B88E4F] via-[#C59B58] to-[#B88E4F] ml-0.5 ${iconDimensions.textMain}`}',
  'className={`font-black italic text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.18)] ml-0.5 ${iconDimensions.textMain}`}'
);
logo = logo.replace(
  'className="text-[#B88E4F] text-xs ml-1 font-serif font-bold animate-pulse"',
  'className="text-white text-xs ml-1 font-serif font-bold animate-pulse"'
);
logo = logo.replace(
  'className={`scanms-logo-subtitle ${darkMode ? "text-[#C5BBAA]" : "text-[#7D715E]"} font-bold uppercase tracking-widest mt-1 ${iconDimensions.textSub}`}',
  'className={`scanms-logo-subtitle ${darkMode ? "text-[#C5BBAA]" : "text-[#2A2012]"} font-bold uppercase tracking-widest mt-1 ${iconDimensions.textSub}`}'
);
fs.writeFileSync('frontend/src/components/common/ScanMSLogo.tsx', logo, 'utf8');

// 2. Refine PublicHeader.css shortcuts contrast
let phCss = fs.readFileSync('frontend/src/components/layout/PublicHeader.css', 'utf8');
phCss = phCss.replace(
  '.public-commerce-header--marketplace .marketplace-shortcuts__item { @apply [min-height:30px]; @apply justify-center; @apply [gap:7px]; @apply [padding:5px_12px]; @apply [color:#7d715e];',
  '.public-commerce-header--marketplace .marketplace-shortcuts__item { @apply [min-height:30px]; @apply justify-center; @apply [gap:7px]; @apply [padding:5px_12px]; @apply [color:#1A1612]!; @apply [font-weight:600]!;'
);
phCss = phCss.replace(
  '.public-commerce-header--marketplace .marketplace-shortcuts__item + .marketplace-shortcuts__item::before { @apply absolute; @apply [left:0]; @apply [top:50%]; @apply [width:1px]; @apply [height:12px]; @apply [transform:translateY(-50%)]; @apply [background:#eae4d7];',
  '.public-commerce-header--marketplace .marketplace-shortcuts__item + .marketplace-shortcuts__item::before { @apply absolute; @apply [left:0]; @apply [top:50%]; @apply [width:1px]; @apply [height:12px]; @apply [transform:translateY(-50%)]; @apply [background:rgba(26,22,18,0.25)];'
);
phCss = phCss.replace(
  '.public-commerce-header--marketplace .marketplace-shortcuts__item svg { @apply [width:15px]; @apply [height:15px]; @apply [stroke-width:1.6]; }',
  '.public-commerce-header--marketplace .marketplace-shortcuts__item svg { @apply [width:15px]; @apply [height:15px]; @apply [stroke-width:1.7]; @apply [color:#1A1612]!; }'
);
phCss = phCss.replace(
  '.public-commerce-header--marketplace .marketplace-shortcuts__item:hover,\n.public-commerce-header--marketplace .marketplace-shortcuts__item[aria-current] { @apply [color:#b88e4f]; }',
  '.public-commerce-header--marketplace .marketplace-shortcuts__item:hover,\n.public-commerce-header--marketplace .marketplace-shortcuts__item[aria-current] { @apply [color:#000000]!; @apply [font-weight:700]!; }'
);
fs.writeFileSync('frontend/src/components/layout/PublicHeader.css', phCss, 'utf8');

// 3. Refine ProductSearchBox search icon color
let psb = fs.readFileSync('frontend/src/components/layout/ProductSearchBox.tsx', 'utf8');
psb = psb.replace('className={darkMode ? "text-[#1A1612]" : "text-[#8C6226]"}', 'className="text-[#1A1612]"');
fs.writeFileSync('frontend/src/components/layout/ProductSearchBox.tsx', psb, 'utf8');

// 4. Clean duplicate RoleIcon in HeaderAccountButton.tsx
let hab = fs.readFileSync('frontend/src/components/layout/HeaderAccountButton.tsx', 'utf8');
hab = hab.replace(
  '<span className={`inline-flex items-center gap-[3px] text-[10px] font-[500] leading-[14px] whitespace-nowrap ${darkMode ? "text-[#C4B499]" : "text-[#7D715E]"}>\n          <RoleIcon className={`w-[10px] h-[10px] shrink-0 ${darkMode ? "text-[#DEBE85]" : "text-[#B88E4F]"}`} aria-hidden="true" />\n          <RoleIcon className="w-[10px] h-[10px] shrink-0" aria-hidden="true" />',
  '<span className={`inline-flex items-center gap-[3px] text-[10px] font-[550] leading-[14px] whitespace-nowrap ${darkMode ? "text-[#C4B499]" : "text-[#3D3020]"}>\n          <RoleIcon className="w-[10px] h-[10px] shrink-0 text-[#1A1612]" aria-hidden="true" />'
);
fs.writeFileSync('frontend/src/components/layout/HeaderAccountButton.tsx', hab, 'utf8');

console.log('Refined contrast and typography on #C49B5B header!');
