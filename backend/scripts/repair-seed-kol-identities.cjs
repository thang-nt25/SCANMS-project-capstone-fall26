// Restore only the 20 canonical fixture identities; never reseed orders or auth.
require('dotenv').config({ quiet: true });
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHash } = require('node:crypto');
const ts = require('typescript');
const Module = require('node:module');
const { PrismaService } = require('../dist/core/database/prisma.service');

function fixtureData() {
  const filename = path.resolve(__dirname, '../prisma/seeds/data/people.data.ts');
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = module.paths;
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
  return loaded.exports;
}
function seedId(key) {
  const bytes = createHash('sha1').update(Buffer.from('cfc50f4069435a3587de6d76b77e1d74', 'hex'))
    .update(`scanms-capstone-2026-v1:${key}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 80;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
async function main() {
  const { CREATOR_NAMES, CREATOR_AVATARS } = fixtureData();
  const p = new PrismaService();
  try {
    const users = await p.user.findMany({
      where: { role: 'COLLABORATOR', email: { in: CREATOR_NAMES.map((_, index) => `kol${String(index + 1).padStart(2, '0')}@seed.scanms.test`) } },
      select: { id: true, email: true, fullName: true, avatarUrl: true,
        collaboratorProfile: { select: { id: true, avatarUrl: true } },
        socialChannels: { select: { id: true, platformName: true, channelName: true, channelUrl: true } } },
    });
    if (users.length !== 20) throw new Error('Expected exactly 20 fixture accounts; no changes made.');
    const plans = CREATOR_NAMES.map((name, index) => {
      const user = users.find(item => item.id === seedId(`creator:${index}`) && item.email === `kol${String(index + 1).padStart(2, '0')}@seed.scanms.test`);
      if (!user) throw new Error(`Fixture identity mismatch at index ${index}; no changes made.`);
      const filename = CREATOR_AVATARS[index % CREATOR_AVATARS.length];
      if (!fs.existsSync(path.resolve(__dirname, '../../frontend/public/assets', filename))) throw new Error('Missing canonical avatar');
      const origin = user.avatarUrl?.startsWith('http') ? new URL(user.avatarUrl).origin : 'http://localhost:5173';
      const avatarUrl = `${origin}/assets/${filename}`;
      const channel = user.socialChannels.find(item => item.id === seedId(`social:${index}`));
      return { user, name, avatarUrl, channel,
        channelData: { platformName: index % 2 === 0 ? 'TIKTOK' : 'YOUTUBE', channelName: `SCANMS Creator ${index + 1}`, channelUrl: `https://social.scanms.invalid/creator/${index + 1}` } };
    });
    const mismatches = plans.filter(item => item.user.fullName !== item.name || item.user.avatarUrl !== item.avatarUrl
      || item.user.collaboratorProfile?.avatarUrl !== item.avatarUrl || (item.channel && Object.entries(item.channelData).some(([key, value]) => item.channel[key] !== value)));
    console.log(JSON.stringify({ accounts: users.length, mismatches: mismatches.length, apply: process.argv.includes('--apply') }));
    if (!process.argv.includes('--apply') || mismatches.length === 0) return;
    const backup = path.join(os.tmpdir(), `scanms-kol-identity-backup-${Date.now()}.json`);
    fs.writeFileSync(backup, JSON.stringify(users, null, 2));
    await p.$transaction(async tx => {
      for (const item of mismatches) {
        await tx.user.update({ where: { id: item.user.id }, data: { fullName: item.name, avatarUrl: item.avatarUrl } });
        if (item.user.collaboratorProfile) await tx.collaboratorProfile.update({ where: { id: item.user.collaboratorProfile.id }, data: { avatarUrl: item.avatarUrl } });
        if (item.channel) await tx.collaboratorSocialChannel.update({ where: { id: item.channel.id }, data: item.channelData });
      }
    }, { timeout: 30000 });
    console.log(`Restored ${mismatches.length} fixture identities. Backup: ${backup}`);
  } finally { await p.onModuleDestroy(); }
}
main().catch(error => { console.error(error.name, error.code || 'Identity repair failed'); process.exitCode = 1; });
