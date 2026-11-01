import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import postcss from 'postcss';
import { compile } from '@tailwindcss/node';

const summary = JSON.parse(await fs.readFile('scripts/tailwind-style-manifest.json', 'utf8'));
function shape(node) {
  if (node.type === 'comment') return null;
  if (node.type === 'decl') return ['decl', node.prop, node.value.replace(/\s+/g, ' ').trim(), !!node.important];
  return [node.type, node.name || node.selector || '', node.params || '', ...(node.nodes || []).map(shape).filter(Boolean)];
}
const failed = [];
for (const { file } of summary.files) {
  const absolute = path.resolve(file);
  const current = await fs.readFile(absolute, 'utf8');
  const original = execFileSync('git', ['show', `${summary.baseline}:frontend/${file.replaceAll('\\', '/')}`], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  const reference = current.match(/^@reference[^;]+;/)?.[0] || '';
  const options = { base: path.dirname(absolute), onDependency() {} };
  const before = (await compile(reference + '\n' + original, options)).build([]);
  const after = (await compile(current, options)).build([]);
  if (JSON.stringify(shape(postcss.parse(before))) !== JSON.stringify(shape(postcss.parse(after)))) failed.push(file);
}
await fs.mkdir('../artifacts/tailwind-migration', { recursive: true });
await fs.writeFile('../artifacts/tailwind-migration/verification.json', JSON.stringify({ checked: summary.files.length, failed }, null, 2));
console.log(JSON.stringify({ checked: summary.files.length, failed }));
if (failed.length) process.exitCode = 1;
