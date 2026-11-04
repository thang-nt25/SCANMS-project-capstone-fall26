const fs = require('fs');
let psb = fs.readFileSync('frontend/src/components/layout/ProductSearchBox.tsx', 'utf8');
psb = psb.replace(
  ': "border-[#EEDFC6] bg-[#FBF5EB] text-[#1A1612] hover:border-[#C59B58] hover:bg-[#F3EFE6]"}',
  ': "border-[#1A1612] bg-[#1A1612] text-white hover:bg-[#2E2314] shadow-2xs"}'
);
psb = psb.replace(
  '<Search size={17} className="text-[#1A1612]" />',
  '<Search size={17} className="text-white" />'
);
fs.writeFileSync('frontend/src/components/layout/ProductSearchBox.tsx', psb, 'utf8');
console.log('Updated ProductSearchBox submit button to crisp obsidian anchor');
