const fs = require('fs');

let code = fs.readFileSync('frontend/src/components/layout/HeaderAccountButton.tsx', 'utf8');

code = code.replace(
  "  onClick: () => void;",
  "  darkMode?: boolean;\n  onClick: () => void;"
);

code = code.replace(
  "export function HeaderAccountButton({ user, role, expanded, menuId, detail, onClick }: HeaderAccountButtonProps) {",
  "export function HeaderAccountButton({ user, role, expanded, menuId, detail, darkMode = true, onClick }: HeaderAccountButtonProps) {"
);

code = code.replace(
  'className="grid place-items-center shrink-0 w-[30px] h-[30px] overflow-hidden border border-[#EAE4D7] rounded-full bg-[#FBF5EB] text-[#B88E4F] text-[12px] font-[600]"',
  'className={`grid place-items-center shrink-0 w-[30px] h-[30px] overflow-hidden border rounded-full text-[12px] font-[600] ${darkMode ? "border-[#443828] bg-[#382F22] text-[#DEBE85]" : "border-[#EAE4D7] bg-[#FBF5EB] text-[#B88E4F]"}`}'
);

code = code.replace(
  '<strong className="block w-full max-w-full truncate text-[12px] font-[600] text-[#1A1612] leading-[15px]">{name}</strong>',
  '<strong className={`block w-full max-w-full truncate text-[12px] font-[600] leading-[15px] ${darkMode ? "text-[#FAF8F5]" : "text-[#1A1612]"}`}>{name}</strong>'
);

code = code.replace(
  '<span className="inline-flex items-center gap-[3px] text-[#7D715E] text-[10px] font-[500] leading-[14px] whitespace-nowrap">',
  '<span className={`inline-flex items-center gap-[3px] text-[10px] font-[500] leading-[14px] whitespace-nowrap ${darkMode ? "text-[#C4B499]" : "text-[#7D715E]"}`}>\n          <RoleIcon className={`w-[10px] h-[10px] shrink-0 ${darkMode ? "text-[#DEBE85]" : "text-[#B88E4F]"}`} aria-hidden="true" />'
);

// Remove the old RoleIcon line that was right below
code = code.replace(
  '          <RoleIcon className="w-[10px] h-[10px] shrink-0" aria-hidden="true" />\n',
  ''
);

fs.writeFileSync('frontend/src/components/layout/HeaderAccountButton.tsx', code, 'utf8');
console.log('HeaderAccountButton updated with darkMode prop successfully');
