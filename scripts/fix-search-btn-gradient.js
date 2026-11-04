const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../frontend/src/components/layout/ProductSearchBox.tsx');
let content = fs.readFileSync(file, 'utf8');

const oldBtnRegex = /<button type="submit" className=\{`product-search-submit[^>]+>[\s\S]*?<\/button>/;
const newBtn = `<button type="submit" className="product-search-submit inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full shadow-xs transition-transform hover:scale-105 active:scale-95" style={{ background: 'linear-gradient(135deg, #B88E4F 0%, #9E7738 100%)', color: '#ffffff', border: 'none' }} aria-label="Tìm kiếm" title="Tìm kiếm"><Search size={16} color="#ffffff" /></button>`;

content = content.replace(oldBtnRegex, newBtn);
fs.writeFileSync(file, content, 'utf8');
console.log('Fixed submit button inline style');
