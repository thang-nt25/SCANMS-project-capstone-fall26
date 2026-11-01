const { jest: base } = require('../package.json');
module.exports = {
  ...base,
  rootDir: '../src',
  testRegex: 'flow23\\.postgres\\.integration\\.spec\\.ts$',
  testTimeout: 45000,
};
