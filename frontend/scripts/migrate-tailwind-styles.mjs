import fs from 'node:fs/promises';
import path from 'node:path';
import postcss from 'postcss';
import { compile } from '@tailwindcss/node';
import { execFileSync } from 'node:child_process';

// Keep selectors, rule order and at-rules intact. Only replace declarations
// whose compiled Tailwind output is identical to the original declaration.
const root = path.resolve('src');
const apply = process.argv.includes('--apply');
const common = new Map(Object.entries({
  'display:flex': 'flex', 'display:grid': 'grid', 'display:block': 'block',
  'display:inline-flex': 'inline-flex', 'display:inline-grid': 'inline-grid',
  'display:none': 'hidden', 'position:relative': 'relative',
  'position:absolute': 'absolute', 'position:fixed': 'fixed',
  'position:sticky': 'sticky', 'flex-direction:column': 'flex-col',
  'flex-direction:row': 'flex-row', 'flex-wrap:wrap': 'flex-wrap',
  'align-items:center': 'items-center', 'align-items:stretch': 'items-stretch',
  'align-items:flex-start': 'items-start', 'align-items:flex-end': 'items-end',
  'justify-content:center': 'justify-center', 'justify-content:space-between': 'justify-between',
  'justify-content:flex-start': 'justify-start', 'justify-content:flex-end': 'justify-end',
  'place-items:center': 'place-items-center', 'overflow:hidden': 'overflow-hidden',
  'overflow:auto': 'overflow-auto', 'overflow-y:auto': 'overflow-y-auto',
  'overflow-x:hidden': 'overflow-x-hidden', 'text-align:center': 'text-center',
  'text-align:left': 'text-left', 'text-align:right': 'text-right',
  'white-space:nowrap': 'whitespace-nowrap', 'white-space:normal': 'whitespace-normal',
  'white-space:pre-wrap': 'whitespace-pre-wrap', 'cursor:pointer': 'cursor-pointer',
  'cursor:not-allowed': 'cursor-not-allowed', 'object-fit:contain': 'object-contain',
  'object-fit:cover': 'object-cover', 'box-sizing:border-box': 'box-border',
  'pointer-events:none': 'pointer-events-none', 'resize:vertical': 'resize-y',
  'box-shadow:none': 'shadow-none', 'text-transform:uppercase': 'uppercase',
  'font-variant-numeric:tabular-nums': 'tabular-nums',
}));
const compiler = await compile('@import "tailwindcss";', { base: process.cwd(), onDependency() {} });
const cache = new Map();
const normalize = value => value.replace(/\s+/g, ' ').trim();
async function utilityFor(decl) {
  // CSS variables remain native; values with literal underscores/backslashes
  // need manual review rather than potentially changing escape semantics.
  if (decl.prop.startsWith('--') || /[_\\;{}\n]/.test(decl.value)) return null;
  const key = `${decl.prop}:${normalize(decl.value)}`;
  if (cache.has(key)) return cache.get(key);
  const utility = common.get(key) || `[${decl.prop}:${decl.value.replaceAll(' ', '_')}]`;
  try {
    const output = postcss.parse(compiler.build([utility]));
    let match = false;
    output.walkRules(rule => {
      if (!rule.selector.startsWith('.')) return;
      const declarations = (rule.nodes || []).filter(node => node.type === 'decl');
      if (declarations.length === 1 && declarations[0].prop === decl.prop && normalize(declarations[0].value) === normalize(decl.value)) match = true;
    });
    cache.set(key, match ? utility : null);
    return match ? utility : null;
  } catch { cache.set(key, null); return null; }
}
async function files(dir) {
  const result = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...await files(full));
    else if (entry.name.endsWith('.css')) result.push(full);
  }
  return result;
}
let total = 0;
const report = [];
for (const file of await files(root)) {
  const source = await fs.readFile(file, 'utf8');
  const ast = postcss.parse(source);
  const declarations = [];
  ast.walkDecls(decl => {
    let parent = decl.parent;
    while (parent) {
      if (parent.type === 'atrule' && /keyframes|font-face|property/.test(parent.name)) return;
      parent = parent.parent;
    }
    declarations.push(decl);
  });
  let converted = 0;
  for (const decl of declarations) {
    const utility = await utilityFor(decl);
    if (!utility) continue;
    decl.replaceWith(postcss.atRule({ name: 'apply', params: utility + (decl.important ? '!' : ''), raws: { before: decl.raws.before } }));
    converted++;
  }
  if (!converted) continue;
  let reference = path.relative(path.dirname(file), path.join(root, 'index.css')).replaceAll('\\', '/');
  if (!reference.startsWith('.')) reference = './' + reference;
  if (file !== path.join(root, 'index.css') && !source.includes('@reference ')) ast.prepend(postcss.atRule({ name: 'reference', params: JSON.stringify(reference) }));
  if (apply) await fs.writeFile(file, ast.toString());
  total += converted;
  report.push({ file: path.relative(process.cwd(), file), converted, nativeRetained: declarations.length - converted });
}
await fs.mkdir('../artifacts/tailwind-migration', { recursive: true });
let previous = { files: [] };
try { previous = JSON.parse(await fs.readFile('../artifacts/tailwind-migration/summary.json', 'utf8')); } catch {}
const combined = new Map(previous.files.map(row => [row.file, row]));
for (const row of report) combined.set(row.file, row);
const manifest = { baseline: previous.baseline || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), apply, files: [...combined.values()] };
manifest.total = manifest.files.reduce((sum, row) => sum + row.converted, 0);
await fs.writeFile('../artifacts/tailwind-migration/summary.json', JSON.stringify(manifest, null, 2));
if (apply) await fs.writeFile('scripts/tailwind-style-manifest.json', JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ apply, files: report.length, declarationsConverted: total, nativeRetained: report.reduce((sum, row) => sum + row.nativeRetained, 0) }));
