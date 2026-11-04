const fs = require('fs');

let code = fs.readFileSync('frontend/src/components/layout/ProductSearchBox.tsx', 'utf8');

code = code.replace(
  "  onClear: () => void; onFilter?: () => void; className?: string;",
  "  onClear: () => void; onFilter?: () => void; className?: string; darkMode?: boolean;"
);

code = code.replace(
  "export function ProductSearchBox({ value, onChange, onSearch, onClear, onFilter, className = '' }: Props) {",
  "export function ProductSearchBox({ value, onChange, onSearch, onClear, onFilter, className = '', darkMode = true }: Props) {"
);

const oldForm = '<form onSubmit={submit} className="product-search-form flex w-full items-center gap-1 rounded border border-[#EAE4D7] bg-white p-[3px] focus-within:border-[#C59B58]" role="search">';
const newForm = `<form onSubmit={submit} className={\`product-search-form flex w-full items-center gap-1 rounded-xl border p-[3px] focus-within:border-[#C59B58] \${darkMode ? "border-[#443828] bg-[#2E271E] shadow-inner" : "border-[#EAE4D7] bg-white"}\`} role="search">`;
code = code.replace(oldForm, newForm);

const oldInput = 'className="min-w-0 w-full flex-1 border-0 bg-transparent px-2.5 py-[7px] text-[13px] leading-normal text-[#1A1612] outline-none placeholder:text-[#7D715E] [&::-webkit-search-cancel-button]:appearance-none max-[480px]:px-[7px] max-[480px]:text-[12px]"';
const newInput = 'className={`min-w-0 w-full flex-1 border-0 bg-transparent px-2.5 py-[7px] text-[13px] leading-normal outline-none [&::-webkit-search-cancel-button]:appearance-none max-[480px]:px-[7px] max-[480px]:text-[12px] ${darkMode ? "text-[#FAF8F5] placeholder:text-[#A89F91]" : "text-[#1A1612] placeholder:text-[#7D715E]"}`}';
code = code.replace(oldInput, newInput);

const oldSubmit = '<button type="submit" className="product-search-submit inline-flex h-9 w-[52px] shrink-0 cursor-pointer items-center justify-center rounded-[3px] border border-[#EEDFC6] bg-[#FBF5EB] text-[#1A1612] hover:border-[#C59B58] hover:bg-[#F3EFE6] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#C59B58] max-[480px]:h-8 max-[480px]:w-10" aria-label="Tìm kiếm" title="Tìm kiếm"><Search size={17} /></button>';
const newSubmit = '<button type="submit" className={`product-search-submit inline-flex h-9 w-[52px] shrink-0 cursor-pointer items-center justify-center rounded-lg border font-bold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#C59B58] max-[480px]:h-8 max-[480px]:w-10 ${darkMode ? "border-[#C59B58] bg-[#C59B58] text-[#1A1612] hover:bg-[#A87D38]" : "border-[#EEDFC6] bg-[#FBF5EB] text-[#1A1612] hover:border-[#C59B58] hover:bg-[#F3EFE6]"}`} aria-label="Tìm kiếm" title="Tìm kiếm"><Search size={17} className={darkMode ? "text-[#1A1612]" : "text-[#8C6226]"} /></button>';
code = code.replace(oldSubmit, newSubmit);

fs.writeFileSync('frontend/src/components/layout/ProductSearchBox.tsx', code, 'utf8');
console.log('ProductSearchBox updated with darkMode prop successfully');
