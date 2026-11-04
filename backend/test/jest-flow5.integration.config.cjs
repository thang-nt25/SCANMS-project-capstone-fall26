module.exports = {
  ...require('./jest-unit.config.cjs'),
  testPathIgnorePatterns: ['/node_modules/'],
  testRegex: /flow5\.postgres\.integration\.spec\.ts$/.source,
};
