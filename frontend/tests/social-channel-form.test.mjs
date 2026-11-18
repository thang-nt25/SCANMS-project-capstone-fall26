import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const module = { exports: {} };
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/utils/social-channel-form.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { module, exports: module.exports, URL });
const { socialChannelFields, socialChannelUrlError } = module.exports;
test('each platform has its own fields and a valid example', () => {
  for (const platform of ['TIKTOK', 'YOUTUBE', 'INSTAGRAM', 'FACEBOOK', 'OTHER']) {
    const fields = socialChannelFields(platform);
    assert.equal(socialChannelUrlError(platform, fields.urlPlaceholder), null);
  }
  assert.equal(socialChannelFields('YOUTUBE').audienceLabel, 'Số người đăng ký');
});
test('reject mismatched domains, deceptive domains and unsafe URLs', () => {
  for (const url of ['https://tiktok.com/@creator', 'https://youtube.com.attacker.test/@creator', 'https://attacker.test/youtube.com', 'javascript:alert(1)', 'https://user:pass@youtube.com/@creator', 'not a url'])
    assert.ok(socialChannelUrlError('YOUTUBE', url), url);
  assert.equal(socialChannelUrlError('YOUTUBE', 'https://m.youtube.com/channel/UC123'), null);
  assert.equal(socialChannelUrlError('OTHER', 'https://my-channel.example/profile'), null);
});
