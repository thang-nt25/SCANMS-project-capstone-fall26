import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function fixture() {
  const calls=[];
  const module={exports:{}};
  const getVietnamLocalities=async(version,kind,parent)=>{
    calls.push([version,kind,parent]);
    return kind==='provinces'?[{code:79,name:'Thành phố Hồ Chí Minh'}]:kind==='districts'?[{code:760,name:'Quận 1'}]:[{code:26734,name:'Phường Bến Nghé'}];
  };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/utils/return-address.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:()=>({getVietnamLocalities})});
  return {...module.exports,calls};
}
test('saved address localities are resolved in their exact parent branch without duplicate address parts',async()=>{
  const f=fixture();
  const address=await f.resolveSavedReturnAddress({name:'Khách A',phone:'0900000000',address:'15 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',provinceName:'',wardName:'',districtName:''});
  assert.equal(address.address,'15 Lê Duẩn');
  assert.equal(address.provinceName,'Thành phố Hồ Chí Minh');
  assert.deepEqual(f.calls,[['v1','provinces',undefined],['v1','districts',79],['v1','wards',760]]);
  assert.equal(f.returnFullAddress(address),'15 Lê Duẩn, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh');
});
test('unrecognized saved localities require editing instead of choosing a plausible replacement',async()=>{
  const f=fixture();
  const value=await f.resolveSavedReturnAddress({name:'Khách A',phone:'0900000000',address:'15 Lê Duẩn, Phường không có trong danh mục, Quận 1, TP. Hồ Chí Minh',provinceName:'',wardName:'',districtName:''});
  assert.equal(value,null);
});
