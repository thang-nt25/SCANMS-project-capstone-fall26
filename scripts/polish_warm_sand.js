const fs = require('fs');

// 1. MarketplacePage.tsx
let mp = fs.readFileSync('frontend/src/pages/public/MarketplacePage.tsx', 'utf8');
mp = mp.replace(/bg-\[#FAF8F5\]/g, 'bg-[#FAF7F2]');
mp = mp.replace(
  'id="catalog-section" className="w-full scroll-mt-36 bg-[#F3EFE6] py-7 text-left lg:py-9"',
  'id="catalog-section" className="w-full scroll-mt-36 bg-[#F5EFE6] py-7 text-left lg:py-9 border-t border-[#DFD6C5]"'
);
mp = mp.replace(
  'className="mb-4 bg-white border border-[#EAE4D7] border-b-[4px] border-b-[#B88E4F]',
  'className="mb-5 rounded-2xl bg-[#FAF7F2] border border-[#DFD6C5] border-b-[3px] border-b-[#C59B58]'
);
mp = mp.replace(
  '<footer className="mt-auto border-t border-[#EAE4D7] bg-[#F3EFE6]',
  '<footer className="mt-auto border-t border-[#DFD6C5] bg-[#ECE5D8]'
);
fs.writeFileSync('frontend/src/pages/public/MarketplacePage.tsx', mp, 'utf8');

// 2. FeaturedStores.tsx
let fsFile = fs.readFileSync('frontend/src/components/marketplace/FeaturedStores.tsx', 'utf8');
fsFile = fsFile.replace(/bg-\[#FAF8F5\]/g, 'bg-[#FAF7F2]');
fsFile = fsFile.replace('border border-[#EAE4D7] bg-white px-4', 'border border-[#DFD6C5] bg-[#FAF7F2] shadow-[0_4px_16px_rgba(35,29,21,0.04)] px-4');
fs.writeFileSync('frontend/src/components/marketplace/FeaturedStores.tsx', fsFile, 'utf8');

// 3. MarketplaceProductCard.tsx
let pc = fs.readFileSync('frontend/src/components/marketplace/MarketplaceProductCard.tsx', 'utf8');
pc = pc.replace(/border-\[#EAE4D7\]/g, 'border-[#DFD6C5]');
fs.writeFileSync('frontend/src/components/marketplace/MarketplaceProductCard.tsx', pc, 'utf8');

console.log('Palette polish applied successfully!');
