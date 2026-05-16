module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@packages/(.*)$': '<rootDir>/packages/$1/src',
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json', isolatedModules: true }]
  }
};
