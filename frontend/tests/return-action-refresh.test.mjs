import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';import ts from 'typescript';
test('committed GHN updates unlock immediately even when all background list reads are stalled',async()=>{
 const module={exports:{}};let mutation;const refreshed=[];const cached=[];let canceled=0;
 vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/hooks/useReturnDetail.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:name=>name==='@tanstack/react-query'?{useQueryClient:()=>({invalidateQueries:({queryKey})=>{refreshed.push(queryKey);return new Promise(()=>{});},cancelQueries:()=>{canceled++;return Promise.resolve();},setQueryData:(...args)=>cached.push(args)}),useMutation:config=>{mutation=config;return config;}}:name==='react'?{}:{}});
 module.exports.useReturnAction('case-1',async()=>({}),{backgroundRefresh:true});
 const result={id:'case-1',status:'COMPLETED',order:{id:'order-1'},events:[],ghnClaim:{status:'SUBMITTED'}};
 await mutation.onSuccess(result);
 assert.equal(refreshed.length,5);assert.equal(canceled,1);assert.equal(cached[0][1],result);
 assert.equal(JSON.stringify(cached[0][0]),JSON.stringify(['return-detail','case-1']));
});
