// Unit tests must never initialize AppModule against the shared project database.
// Real PostgreSQL/Redis suites remain in Git and are run explicitly with isolated services.
const { jest: base } = require('../package.json');

module.exports = {
  ...base,
  rootDir: '../src',
  testPathIgnorePatterns: [
    '/node_modules/',
    '\\.integration\\.spec\\.ts$',
    '\\.e2e\\.spec\\.ts$',
    // Legacy filename: this suite intentionally connects to real Redis, not a mock.
    '[\\\\/]referral-links[\\\\/]tests[\\\\/]click-rate-limit\\.spec\\.ts$',
  ],
};
