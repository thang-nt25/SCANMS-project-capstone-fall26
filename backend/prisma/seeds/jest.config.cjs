module.exports = {
  rootDir: '../..',
  testMatch: ['<rootDir>/prisma/seeds/tests/**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      { tsconfig: '<rootDir>/prisma/tsconfig.seed.json' },
    ],
  },
  testEnvironment: 'node',
  clearMocks: true,
};
