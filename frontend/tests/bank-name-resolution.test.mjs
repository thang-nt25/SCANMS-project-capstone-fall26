import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../src/config/banks.config.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {findBankByQuery,VIETNAM_BANKS}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
test('every saved full bank name resolves to its own logo and short name',()=>{
 for(const bank of VIETNAM_BANKS){assert.equal(findBankByQuery(bank.name)?.bin,bank.bin);assert.equal(findBankByQuery(bank.name.normalize('NFC').toUpperCase())?.logo,bank.logo);}
});
test('BIN, code, short name and selected composite values still resolve',()=>{
 for(const bank of VIETNAM_BANKS)for(const identifier of [bank.bin,bank.code,bank.shortName,`${bank.shortName} (${bank.name})`])assert.equal(findBankByQuery(identifier)?.bin,bank.bin,identifier);
});
test('unknown names remain unknown rather than showing another bank logo',()=>{
 assert.equal(findBankByQuery('Unknown bank'),undefined);assert.equal(findBankByQuery(''),undefined);
});
