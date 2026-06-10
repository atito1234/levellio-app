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
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  // The project's tsconfig uses jsx:"preserve" (Babel transforms JSX at build).
  // For tests, have ts-jest compile JSX so react-test-renderer can run.
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
  },
  moduleNameMapper: {
    '^expo-secure-store$': '<rootDir>/jest/mocks/expo-secure-store.ts',
    '^react-native-svg$': '<rootDir>/jest/mocks/react-native-svg.tsx',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
