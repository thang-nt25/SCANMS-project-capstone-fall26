const fs = require('fs');

let code = fs.readFileSync('frontend/src/components/common/ScanMSLogo.tsx', 'utf8');

code = code.replace(
  "  variant?: 'full' | 'icon';",
  "  variant?: 'full' | 'icon';\n  darkMode?: boolean;"
);

code = code.replace(
  "  variant = 'full',",
  "  variant = 'full',\n  darkMode = false,"
);

code = code.replace(
  "className={`font-black tracking-tight text-[#1A1612] ${iconDimensions.textMain}`}",
  "className={`font-black tracking-tight ${darkMode ? 'text-[#FAF8F5]' : 'text-[#1A1612]'} ${iconDimensions.textMain}`}"
);

code = code.replace(
  "className={`scanms-logo-subtitle text-[#7D715E] font-bold uppercase tracking-widest mt-1 ${iconDimensions.textSub}`}",
  "className={`scanms-logo-subtitle ${darkMode ? 'text-[#C4B499]' : 'text-[#7D715E]'} font-bold uppercase tracking-widest mt-1 ${iconDimensions.textSub}`}"
);

fs.writeFileSync('frontend/src/components/common/ScanMSLogo.tsx', code, 'utf8');
console.log('ScanMSLogo updated with darkMode prop successfully');
