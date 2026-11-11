import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url);
function render(path, exported) {
  const source = readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')
    .replace("const [loadError, setLoadError] = useState('');", "const [loadError, setLoadError] = useState('Connection unavailable');")
    .replace('const [loading, setLoading] = useState(true);', 'const [loading, setLoading] = useState(false);')
    .replace('useState<boolean>(() => !lastCreatorIncentivesSnapshot)', 'useState<boolean>(false)');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: name => {
    if (['react', 'react/jsx-runtime', 'lucide-react'].includes(name)) return require(name);
    return { registerPrivateCacheReset() {}, analyticsService: {}, referralLinksService: {}, toast: {} };
  } });
  return renderToStaticMarkup(React.createElement(module.exports[exported], {}));
}
test('failed Shop deals load provides retry and never claims an empty agreement list', () => {
  const html = render('components/affiliate/ShopActiveDealsTab.tsx', 'default');
  assert.ok(html.includes('role="alert"') && html.includes('Connection unavailable') && html.includes('Thử lại'));
  assert.ok(!html.includes('Không có thỏa thuận nào phù hợp với bộ lọc.'));
});
test('failed creator incentives load is distinct from no vouchers', () => {
  const html = render('components/promotions/ShopCreatorIncentivesTab.tsx', 'ShopCreatorIncentivesTab');
  assert.ok(html.includes('role="alert"') && html.includes('Thử lại'));
  assert.ok(!html.includes('Chưa có mã ưu đãi định danh KOC nào được phát hành.'));
});
