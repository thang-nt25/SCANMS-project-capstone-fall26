const fs = require('fs');
let phCss = fs.readFileSync('frontend/src/components/layout/PublicHeader.css', 'utf8');

// Remove ::before pipe from shortcuts in PublicHeader.css
phCss = phCss.replace(
  /\.public-commerce-header--marketplace \.marketplace-shortcuts__item \+ \.marketplace-shortcuts__item::before \{[\s\S]*?\}/g,
  ''
);

fs.writeFileSync('frontend/src/components/layout/PublicHeader.css', phCss, 'utf8');
console.log('Removed old ::before pipe rule from PublicHeader.css');
