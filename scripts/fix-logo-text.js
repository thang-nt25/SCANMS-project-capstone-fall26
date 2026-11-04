const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, '../frontend/src/components/common/ScanMSLogo.tsx');
let content = fs.readFileSync(logoPath, 'utf8');

content = content.replace(
  'className={`font-black italic text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.18)] ml-0.5 ${iconDimensions.textMain}`}',
  'className={`font-black italic ${darkMode ? "text-white" : "text-[#B88E4F]"} ml-0.5 ${iconDimensions.textMain}`}'
);

content = content.replace(
  'className="text-white text-xs ml-1 font-serif font-bold animate-pulse"',
  'className={`text-xs ml-1 font-serif font-bold animate-pulse ${darkMode ? "text-white" : "text-[#C59B58]"}`}'
);

fs.writeFileSync(logoPath, content, 'utf8');
console.log('Successfully fixed ScanMSLogo.tsx');
