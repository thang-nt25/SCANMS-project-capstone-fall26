const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/common/ScanMSLogo.tsx', 'utf8');

content = content.replace(
  'className={`font-black tracking-tight  ${iconDimensions.textMain}`}',
  'className={`font-black tracking-tight ${darkMode ? "text-white" : "text-[#1A1612]"} ${iconDimensions.textMain}`}'
);

content = content.replace(
  'className={`scanms-logo-subtitle  font-bold uppercase tracking-widest mt-1 ${iconDimensions.textSub}`}',
  'className={`scanms-logo-subtitle ${darkMode ? "text-[#C5BBAA]" : "text-[#7D715E]"} font-bold uppercase tracking-widest mt-1 ${iconDimensions.textSub}`}'
);

fs.writeFileSync('frontend/src/components/common/ScanMSLogo.tsx', content, 'utf8');
console.log('Replaced successfully! Has darkMode now:', content.includes('darkMode ?'));
