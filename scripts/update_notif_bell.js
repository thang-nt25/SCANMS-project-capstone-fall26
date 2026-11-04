const fs = require('fs');
let nd = fs.readFileSync('frontend/src/components/layout/NotificationDropdown.tsx', 'utf8');
nd = nd.replace(
  'className="relative grid place-items-center w-[36px] h-[36px] border border-[#EAE4D7] rounded-full bg-white text-[#7D715E] cursor-pointer hover:bg-[#FBF5EB] hover:text-[#B88E4F] transition-colors focus-visible:outline-2 focus-visible:outline-[#C59B58] focus-visible:outline-offset-[-2px]"',
  'className="relative grid place-items-center w-[36px] h-[36px] rounded-full bg-white text-[#1A1612] shadow-2xs hover:bg-[#FAF8F5] transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[#1A1612]"'
);
fs.writeFileSync('frontend/src/components/layout/NotificationDropdown.tsx', nd, 'utf8');
console.log('Updated NotificationDropdown bell trigger button');
