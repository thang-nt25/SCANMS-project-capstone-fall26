import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url);
const module = { exports: {} };
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/components/returns/ReturnOutcomeCard.tsx', import.meta.url),'utf8'), { compilerOptions: { module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX } }).outputText, { module, exports:module.exports, require:name=>name.endsWith('.css')?{}:require(name) });
const base = { status:'REFUND_PENDING',resolution:'REFUND',events:[],dispute:{ ruling:'APPROVE_REFUND',resolutionNotes:'Ghi chú có nhắc GHN nhưng chưa xác minh.' },refund:{ amount:179001,method:'WALLET',status:'PENDING' } };
const render = overrides => renderToStaticMarkup(React.createElement(module.exports.ReturnOutcomeCard,{request:{...base,...overrides}}));
test('waiting refund shows exact amount and unchanged decision note without inferring logistics liability',()=>{
 const html=render({});assert.match(html,/179.001 ₫/);assert.match(html,/Chấp thuận hoàn tiền/);assert.match(html,/Chờ khách xác nhận/);assert.match(html,/Chưa chuyển tiền/);assert.ok(html.includes(base.dispute.resolutionNotes));assert.ok(!html.includes('Trách nhiệm:'));assert.ok(!html.includes('Shop không tạo'));assert.ok(!html.includes('Đã hoàn vào ví SCANMS'));
});
test('verified liability comes from the structured assessment',()=>{
 assert.match(render({events:[{type:'LIABILITY_ASSESSED',data:{liability:'LOGISTICS_FAULT'}}]}),/Trách nhiệm:.*GHN \/ vận chuyển/);
});
test('actual refund outcome supersedes a pending case and includes payment time',()=>{
 const html=render({refund:{...base.refund,status:'SUCCEEDED',processedAt:'2026-11-17T08:00:00Z'}});assert.match(html,/Đã hoàn vào ví SCANMS/);assert.match(html,/Thời gian hoàn/);assert.ok(!html.includes('Chưa chuyển tiền'));
});
test('processing and failed confirmed refunds retain their actual statuses',()=>{
 assert.match(render({refund:{...base.refund,status:'PROCESSING'}}),/Đang hoàn tiền/);
 const html=render({events:[{type:'CUSTOMER_REFUND_CONFIRMED'}],refund:{...base.refund,status:'FAILED',failureReason:'Giao dịch cần đối soát'}});assert.match(html,/Hoàn tiền chưa thành công/);assert.match(html,/Giao dịch cần đối soát/);assert.ok(!html.includes('Chờ khách xác nhận'));
});
test('upheld shop decision does not imply refund and missing results render nothing',()=>{
 assert.match(render({refund:null,dispute:{ruling:'UPHOLD_SHOP',resolutionNotes:'Giữ nguyên kết quả'}}),/Giữ nguyên quyết định của Shop/);
 assert.equal(render({dispute:null,refund:null}),'');
});
