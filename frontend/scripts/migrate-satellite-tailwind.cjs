// One-time migration following origin/thang's unified Tailwind architecture.
// Parse declarations rather than replacing CSS text; keep selectors, conditions,
// declaration order and !important intact. Run with --write only after validation.
const fs = require('node:fs');
const path = require('node:path');
const postcss = require('postcss');
const ts = require('typescript');
const { compile } = require('@tailwindcss/node');
const root = path.resolve(__dirname, '..');
const src = path.join(root, 'src');
const archive = path.resolve(root, '../.tmp/tailwind-source');
const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else files.push(file);
  }
}
walk(src);
const styles = files.filter(file => file.endsWith('.css') && file !== path.join(src, 'index.css'));
const visited = new Set();
const ordered = [];
function visit(file) {
  if (visited.has(file)) return;
  visited.add(file);
  if (file.endsWith('.css')) { if (styles.includes(file)) ordered.push(file); return; }
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  function imports(node) {
    let specifier;
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) specifier = node.moduleSpecifier.text;
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && ts.isStringLiteral(node.arguments[0])) specifier = node.arguments[0].text;
    if (specifier && (specifier.startsWith('.') || specifier.startsWith('@/'))) {
      const candidate = specifier.startsWith('@/') ? path.join(src, specifier.slice(2)) : path.resolve(path.dirname(file), specifier);
      const resolved = [candidate, ...['.tsx', '.ts', '/index.tsx', '/index.ts'].map(extension => candidate + extension)].find(p => fs.existsSync(p) && fs.statSync(p).isFile());
      if (resolved) visit(resolved);
    }
    ts.forEachChild(node, imports);
  }
  imports(source);
}
visit(path.join(src, 'main.tsx'));
for (const file of styles) visit(file);
const simple = {
  'display:flex': 'flex', 'display:grid': 'grid', 'display:block': 'block',
  'display:none': 'hidden', 'display:inline-flex': 'inline-flex',
  'display:inline-block': 'inline-block', 'position:relative': 'relative',
  'position:absolute': 'absolute', 'position:fixed': 'fixed', 'position:sticky': 'sticky',
  'flex-direction:column': 'flex-col', 'flex-direction:row': 'flex-row',
  'flex-wrap:wrap': 'flex-wrap', 'align-items:center': 'items-center',
  'align-items:flex-start': 'items-start', 'align-items:stretch': 'items-stretch',
  'justify-content:center': 'justify-center', 'justify-content:space-between': 'justify-between',
  'justify-content:flex-end': 'justify-end', 'justify-content:flex-start': 'justify-start',
  'text-align:center': 'text-center', 'text-align:left': 'text-left',
  'text-align:right': 'text-right', 'overflow:hidden': 'overflow-hidden',
  'overflow:auto': 'overflow-auto', 'overflow-x:auto': 'overflow-x-auto',
  'overflow-y:auto': 'overflow-y-auto', 'white-space:nowrap': 'whitespace-nowrap',
  'cursor:pointer': 'cursor-pointer', 'pointer-events:none': 'pointer-events-none',
  'box-sizing:border-box': 'box-border', 'text-transform:uppercase': 'uppercase',
};
const encode = value => value.replace(/_/g, '\\_').replace(/\s/g, '_');
async function main() {
  if (!styles.length) throw new Error('No satellite styles found; migration already applied?');
  const sections = [];
  const proofs = [];
  let count = 0;
  for (const file of ordered) {
    const original = fs.readFileSync(file, 'utf8');
    const parsed = postcss.parse(original, { from: file });
    parsed.walkAtRules('reference', rule => rule.remove());
    parsed.walkDecls(decl => {
      // Tokens are kept as native CSS variables, as in origin/thang's @theme.
      if (decl.prop.startsWith('--')) return;
      const utility = simple[`${decl.prop}:${decl.value}`] || `[${decl.prop}:${encode(decl.value)}]`;
      const candidate = `${utility}${decl.important ? '!' : ''}`;
      proofs.push({ selector: `.migration-proof-${count}`, property: decl.prop, value: decl.value, important: !!decl.important, candidate });
      count++;
      decl.replaceWith(postcss.atRule({ name: 'apply', params: candidate, raws: { before: decl.raws.before } }));
    });
    const relative = path.relative(src, file).replaceAll('\\', '/');
    sections.push(`/* Tailwind component styles: ${relative} */\n${parsed.toString().trim()}\n`);
  }
  const proofSource = '@import "tailwindcss";\n' + proofs.map(p => `${p.selector}{@apply ${p.candidate};}`).join('\n');
  const compiler = await compile(proofSource, { base: root, onDependency() {} });
  const expanded = postcss.parse(compiler.build([]));
  const output = new Map();
  expanded.walkRules(rule => { if (rule.selector.startsWith('.migration-proof-')) output.set(rule.selector, rule.nodes.filter(n => n.type === 'decl')); });
  const failures = [];
  // Tailwind emits the same values; normalize insignificant whitespace only.
  const normalize = value => value.trim().replace(/\s+/g, ' ').replace(/\s*([,:])\s*/g, '$1');
  for (const proof of proofs) {
    const declarations = output.get(proof.selector) || [];
    const match = declarations.find(d => d.prop === proof.property && normalize(d.value) === normalize(proof.value) && !!d.important === proof.important);
    if (!match) failures.push({ ...proof, output: declarations.map(d => d.toString()) });
  }
  if (failures.length) {
    fs.mkdirSync(archive, { recursive: true });
    fs.writeFileSync(path.join(archive, 'validation-failures.json'), JSON.stringify(failures, null, 2));
    throw new Error(`${failures.length} declarations need review; see .tmp/tailwind-source/validation-failures.json`);
  }
  console.log(`Validated ${count} declarations in ${ordered.length} files against Tailwind expansion.`);
  if (!process.argv.includes('--write')) return;
  const indexPath = path.join(src, 'index.css');
  const originalIndex = fs.readFileSync(indexPath, 'utf8');
  fs.mkdirSync(archive, { recursive: true });
  fs.writeFileSync(path.join(archive, 'index.css'), originalIndex);
  // Keep migrated rules unlayered: their existing cascade takes precedence over
  // Tailwind utilities. Wrapping in a layer would silently change specificity.
  fs.writeFileSync(indexPath, originalIndex + '\n/* Unified Tailwind styles: preserve the existing component cascade. */\n' + sections.join('\n'));
  let imports = 0;
  for (const file of [...files.filter(f => /\.[jt]sx?$/.test(f)), ...fs.readdirSync(path.join(root, 'tests/fixtures')).filter(f => /\.[jt]sx?$/.test(f)).map(f => path.join(root, 'tests/fixtures', f))]) {
    const source = fs.readFileSync(file, 'utf8');
    const next = source.replace(/^[ \t]*import\s*['"]([^'"\r\n]+\.css)['"];?[ \t]*\r?\n/gm, (statement, specifier) => {
      const resolved = path.resolve(path.dirname(file), specifier);
      if (!styles.includes(resolved)) return statement;
      imports++;
      return '';
    });
    if (next !== source) {
      const backup = path.join(archive, path.relative(src, file));
      fs.mkdirSync(path.dirname(backup), { recursive: true });
      fs.writeFileSync(backup, source);
      fs.writeFileSync(file, next);
    }
  }
  for (const file of styles) {
    const backup = path.join(archive, path.relative(src, file));
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    fs.copyFileSync(file, backup);
    fs.unlinkSync(file);
  }
  fs.writeFileSync(path.join(archive, 'manifest.json'), JSON.stringify({ declarations: count, files: ordered.map(file => path.relative(src, file)), imports }, null, 2));
  console.log(`Consolidated into src/index.css; removed ${imports} satellite imports. Public reference assets unchanged.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
