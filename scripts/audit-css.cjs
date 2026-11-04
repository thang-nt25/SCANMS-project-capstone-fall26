const fs = require('fs');
const path = require('path');

function getFiles(dir, exts) {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of list) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      results = results.concat(getFiles(fullPath, exts));
    } else if (exts.includes(path.extname(item.name))) {
      results.push(fullPath);
    }
  }
  return results;
}

const srcDir = path.resolve('frontend/src');
const cssFiles = getFiles(srcDir, ['.css']);
const codeFiles = getFiles(srcDir, ['.tsx', '.ts', '.css']);

const codeContents = codeFiles.map(f => ({
  file: path.relative(srcDir, f),
  fullPath: f,
  content: fs.readFileSync(f, 'utf8')
}));

let orphanCount = 0;
let importedCount = 0;
const orphanList = [];
const importedList = [];

for (const css of cssFiles) {
  const relPath = path.relative(srcDir, css);
  if (relPath === 'index.css') continue;
  const baseName = path.basename(css);
  const size = fs.statSync(css).size;
  const importers = [];

  for (const c of codeContents) {
    if (c.fullPath !== css && c.file !== 'index.css') {
      const regex = new RegExp("['\"].*?" + baseName.replace('.', '\\.') + "['\"]");
      if (regex.test(c.content)) {
        importers.push(c.file);
      }
    }
  }

  if (importers.length === 0) {
    orphanCount++;
    orphanList.push({ file: relPath, size });
  } else {
    importedCount++;
    importedList.push({ file: relPath, size, importers });
  }
}

console.log('--- AUDIT SUMMARY ---');
console.log('Total non-index CSS files:', cssFiles.length - 1);
console.log('Imported in TSX/TS/CSS:', importedCount);
console.log('Orphaned (never imported):', orphanCount);

console.log('\n--- ORPHANED CSS FILES ---');
orphanList.forEach(o => console.log(`- ${o.file} (${(o.size/1024).toFixed(1)} KB)`));

console.log('\n--- ACTIVELY IMPORTED CSS FILES ---');
importedList.forEach(i => console.log(`- ${i.file} (${(i.size/1024).toFixed(1)} KB) -> imported by: ${i.importers.join(', ')}`));
