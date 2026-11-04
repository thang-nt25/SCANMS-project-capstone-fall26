const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../frontend/src/components/layout/PublicHeader.tsx');
let content = fs.readFileSync(file, 'utf8');
content = content.replace('  Package,\r\n', '').replace('  Package,\n', '');
fs.writeFileSync(file, content, 'utf8');
console.log('Removed Package from PublicHeader.tsx');
