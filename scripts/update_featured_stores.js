const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/marketplace/FeaturedStores.tsx', 'utf8');
content = content.replace('className="scroll-mt-36 bg-[#FAF7F2] py-5 text-left sm:py-7"', 'className="scroll-mt-36 bg-[#FAF8F5] py-5 text-left sm:py-7"');
content = content.replace('rounded-3xl border border-[#DFD6C5] bg-[#FAF7F2] shadow-[0_4px_16px_rgba(35,29,21,0.04)] px-4 py-6 sm:px-6 sm:py-7', 'rounded-2xl border border-[#EAE4D7] bg-white shadow-[0_2px_12px_rgba(35,29,21,0.03)] px-5 py-6 sm:px-6 sm:py-7');
fs.writeFileSync('frontend/src/components/marketplace/FeaturedStores.tsx', content, 'utf8');
console.log('Updated FeaturedStores.tsx');
