const fs = require('node:fs');
const path = require('node:path');
const before = path.resolve(__dirname, '../../.tmp/tailwind-before');
const after = path.resolve(__dirname, '../../.tmp/tailwind-after');
const summary = [];
for (const file of fs.readdirSync(before).filter(name => name.endsWith('.json'))) {
  if (!fs.existsSync(path.join(after, file))) continue;
  const original = JSON.parse(fs.readFileSync(path.join(before, file), 'utf8'));
  const migrated = JSON.parse(fs.readFileSync(path.join(after, file), 'utf8'));
  const differences = [];
  if (original.length !== migrated.length) differences.push({ nodes: [original.length, migrated.length] });
  for (let i = 0; i < Math.min(original.length, migrated.length); i++) {
    if (original[i].tag !== migrated[i].tag || original[i].className !== migrated[i].className) {
      differences.push({ node: i, identity: [original[i].tag, migrated[i].tag] });
      continue;
    }
    for (const [key, value] of Object.entries(original[i].values)) {
      if (value !== migrated[i].values[key]) differences.push({ node: i, selector: `${original[i].tag}.${original[i].className}`, property: key, before: value, after: migrated[i].values[key] });
    }
  }
  summary.push({ file, nodes: original.length, differences });
}
fs.writeFileSync(path.join(after, 'parity-report.json'), JSON.stringify(summary, null, 2));
for (const entry of summary) console.log(`${entry.file}: ${entry.nodes} nodes, ${entry.differences.length} changed values`);
console.log(`Compared ${summary.length} snapshots. Detailed report: .tmp/tailwind-after/parity-report.json`);
