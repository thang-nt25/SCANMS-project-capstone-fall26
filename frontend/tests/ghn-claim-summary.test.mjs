import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require=createRequire(import.meta.url);const module={exports:{}};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/components/returns/GhnClaimSummary.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module,exports:module.exports,require:name=>name.endsWith('.css')?{}:require(name)});
const base={status:'DRAFT',originalTrackingNumber:'LYUXBV',updatedAt:new Date().toISOString()};
const render=overrides=>renderToStaticMarkup(React.createElement(module.exports.GhnClaimSummary,{claim:{...base,...overrides}}));
test('draft claim does not invent amounts or reference and shows a copy action',()=>{
 const html=render({});assert.match(html,/Chờ gửi GHN/);assert.match(html,/LYUXBV/);assert.match(html,/Chưa ghi nhận/);assert.match(html,/Chưa có kết quả/);assert.ok(!html.includes('0 ₫'));assert.match(html,/Sao chép vận đơn liên quan/);assert.ok(!html.includes('179.001'));
});
test('amounts and reference are rendered from compensation data including explicit zero',()=>{
 const html=render({status:'ACCEPTED',ghnReference:'CLAIM-001',claimedAmount:21000,approvedAmount:0,notes:'Ghi chú gốc'});assert.match(html,/21.000 ₫/);assert.match(html,/0 ₫/);assert.match(html,/CLAIM-001/);assert.match(html,/Ghi chú gốc/);assert.match(html,/GHN đã chấp thuận/);
});
test('follow-up and paid statuses remain distinct',()=>{
 assert.match(render({status:'SUBMITTED',updatedAt:new Date(Date.now()-8*86400000).toISOString()}),/Quá 7 ngày/);
 assert.match(render({status:'NEEDS_MORE_EVIDENCE'}),/Cần bổ sung chứng từ/);
 assert.match(render({status:'PAID'}),/Đã ghi nhận GHN thanh toán/);
 assert.match(render({status:'REJECTED'}),/GHN từ chối bồi hoàn/);
});
