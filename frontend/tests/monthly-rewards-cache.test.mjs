import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/services/monthly-rewards.service.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function fixture() {
  const values = new Map([['token','shop-token'],['user','shop-a'],['current_store_id','store-a']]);
  const storage = {getItem: key => values.get(key) ?? null};
  const calls = []; const reset = []; const clock = {time:1000};
  let revision = 0, session = null, response = {policies:[],stores:[]};
  const api = {get: (...args) => { calls.push(args); return Promise.resolve({data: response}); }, post: async () => {revision++; return {ok:true};}};
  const cache = { get revision(){return revision;}, setSession(value){ if(value !== session) {session=value; revision++;} } };
  const module = {exports:{}};
  new Function('require','module','exports','localStorage','Date',compiled)(name => name === './api' ? {__esModule:true,default:api} : name.includes('api-cache') ? {apiCache:cache} : {registerPrivateCacheReset:fn=>reset.push(fn)}, module, module.exports, storage, class extends Date {static now(){return clock.time;}});
  return {service:module.exports.monthlyRewards,values,calls,api,clock,reset,setResponse(value){response=value;}};
}
test('returning to a recently read month needs no second network request; expires after 15 seconds', async () => {
  const f = fixture();
  const first = await f.service.list('2026-11','store-a');
  assert.equal(f.service.cached('2026-11','store-a'),first);
  await f.service.list('2026-10','store-a'); await f.service.list('2026-11','store-a');
  assert.equal(f.calls.length,2);
  f.clock.time += 15001;
  assert.equal(f.service.cached('2026-11','store-a'),null);
  await f.service.list('2026-11','store-a'); assert.equal(f.calls.length,3);
});
test('deduplicates in-flight month reads without mixing store or account scopes', async () => {
  const f = fixture(); let resolve;
  f.api.get = (...args) => {f.calls.push(args); return new Promise(done => {resolve=done;});};
  const a = f.service.list('2026-11','store-a'), b = f.service.list('2026-11','store-a');
  assert.equal(a,b); assert.equal(f.calls.length,1);
  resolve({data:{policies:[],stores:[]}}); await a;
  assert.equal(f.service.cached('2026-11','store-b'),null);
  f.values.set('token','other-token'); f.values.set('user','admin-b');
  assert.equal(f.service.cached('2026-11','store-a'),null);
});
test('mutations and session resets clear cached previews', async () => {
  const f=fixture(); await f.service.list('2026-11','store-a');
  await f.service.request('policy','kol');
  assert.equal(f.service.cached('2026-11','store-a'),null);
  await f.service.list('2026-11','store-a'); f.reset[0]();
  assert.equal(f.service.cached('2026-11','store-a'),null);
});
test('late reads cannot refill snapshots after a mutation invalidates them', async () => {
  const f=fixture(); let resolve;
  f.api.get=()=>new Promise(done=>{resolve=done;});
  const reading=f.service.list('2026-11','store-a');
  await f.service.reviewGrant('grant','APPROVED');
  resolve({data:{policies:[],stores:[]}}); await reading;
  assert.equal(f.service.cached('2026-11','store-a'),null);
});
