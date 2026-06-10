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
    '^expo-secure-store$': '<rootDir>/jest/mocks/expo-secure-store.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
