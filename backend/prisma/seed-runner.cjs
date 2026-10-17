// Resolve the project's TypeScript runtime directly, including on Windows/CI
// when Prisma is invoked without npm's node_modules/.bin on PATH.
require('ts-node').register({
  project: require('node:path').join(__dirname, 'tsconfig.seed.json'),
});
require('./seed.ts');
