import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../src/components/affiliate/KolTierExplanation.tsx', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
const module = { exports: {} };
vm.runInNewContext(code, { module, exports: module.exports, require });
const bronze = { name: 'Đồng', minRevenueThreshold: 0, extraBonusPercentage: 0 };
const gold = { name: 'Vàng', minRevenueThreshold: 20000000, extraBonusPercentage: 2 };
const diamond = { name: 'Kim Cương', minRevenueThreshold: 50000000, extraBonusPercentage: 3 };
const render = (status) => renderToStaticMarkup(module.exports.KolTierExplanation({ status: {
  currentTier: bronze, qualifiedTier: gold, currentRevenue: 25000000, nextTier: gold,
  assessmentPeriod: { startsAt: '2026-08-31T17:00:00Z', endsAt: '2026-09-30T17:00:00Z' },
  nextEvaluationAt: '2026-10-31T17:15:00Z', ...status,
} }));

test('shows the current Bronze tier and next target without claiming a promotion already applies', () => {
  const html = render({});
  assert.match(html, /Hạng đối tác khởi đầu \(Đồng\)/);
  assert.match(html, /Mục tiêu thăng hạng tiếp theo/);
  assert.match(html, /Vàng \(\+2%\)/);
  assert.doesNotMatch(html, /Bạn đã lên hạng/);
  assert.match(html, /25\.000\.000/);
  assert.match(html, /09\/2026/);
  assert.match(html, /00:15 ngày 1 mỗi tháng/);
});
test('explains the 30-day grace period and safe step-down while preserving the current bonus', () => {
  const html = render({ currentTier: gold, qualifiedTier: bronze, currentRevenue: 1000000, nextTier: diamond,
    cycleStatus: 'GRACE_PERIOD', daysRemaining: 12, stepDownTier: { name: 'Bạc', extraBonusPercentage: 1 } });
  assert.match(html, /Ân hạn 30 ngày/);
  assert.match(html, /Còn 12 ngày ân hạn/);
  assert.match(html, /bảo lưu trọn vẹn quyền lợi/);
  assert.match(html, /\+2% thù lao/);
  assert.match(html, /11\.000\.000/);
  assert.match(html, /hạ sang hạng Bạc \+1%/);
  assert.match(html, /49\.000\.000/);
  assert.doesNotMatch(html, /Bạn đã lên hạng/);
});
test('shows the applied bonus and 60 percent maintenance threshold for the reported month', () => {
  const html = render({ currentTier: gold, qualifiedTier: gold, nextTier: diamond });
  assert.match(html, /Đã bảo toàn vị thế Hạng Vàng/);
  assert.match(html, /Vàng \(\+2% thù lao\)/);
  assert.match(html, /60% GMV thăng hạng/);
  assert.match(html, /12\.000\.000/);
  assert.match(html, /tháng 09\/2026/);
  assert.doesNotMatch(html, /Còn \d+ ngày ân hạn/);
});
