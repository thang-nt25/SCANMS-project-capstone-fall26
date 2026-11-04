const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../frontend/src/components/marketplace/MarketplaceHero.tsx');
let content = fs.readFileSync(file, 'utf8');
content = content.replace('Radio, ', '').replace('Radio,', '');
fs.writeFileSync(file, content, 'utf8');
console.log('Removed Radio import from MarketplaceHero.tsx');
