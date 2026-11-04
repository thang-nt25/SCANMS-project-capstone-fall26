const fs = require('fs');
let ph = fs.readFileSync('frontend/src/components/layout/PublicHeader.tsx', 'utf8');
ph = ph.replace(
  'className="inline-flex items-center gap-2 whitespace-nowrap px-2 sm:px-3 py-2 rounded-xl text-xs font-bold text-[#1A1612] bg-[#C59B58] border border-[#B88E4F] hover:bg-[#B88E4F] shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B88E4F]"',
  'className="inline-flex items-center gap-2 whitespace-nowrap px-3 sm:px-4 py-2 rounded-xl text-xs font-bold text-[#1A1612] bg-white border border-black/5 hover:bg-[#FAF8F5] shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1612]"'
);
ph = ph.replace(
  '<User className="h-4 w-4 text-[#B88E4F]" aria-hidden="true" />',
  '<User className="h-4 w-4 text-[#1A1612]" aria-hidden="true" />'
);
fs.writeFileSync('frontend/src/components/layout/PublicHeader.tsx', ph, 'utf8');
console.log('Updated guest login button in PublicHeader.tsx');
