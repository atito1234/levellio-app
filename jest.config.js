/**
 * Jest config. Logic in src/lib is pure TypeScript with no React Native
 * runtime, so we use ts-jest in a node environment for fast, reliable unit
 * tests. The @/* alias mirrors tsconfig.json.
 */
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
