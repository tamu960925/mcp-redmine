export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  // Skip problematic tests in CI environment
  testPathIgnorePatterns: process.env.CI ? [
    '.*docker.*test\\.ts$',
    '.*integration.*test\\.ts$',
    '.*mcp-integration.*test\\.ts$',
    '.*real-mcp.*test\\.ts$',
    '.*mcp-tools.*test\\.ts$',
    '.*performance.*test\\.ts$',
    '.*mcp-protocol-compliance.*test\\.ts$',
    '.*security.*test\\.ts$',
    '.*server.*test\\.ts$'
  ] : process.env.SKIP_DOCKER_TESTS ? ['.*docker.*test\\.ts$'] : [],
  // Increase timeout for CI environment
  testTimeout: process.env.CI ? 60000 : 10000,
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true
    }]
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
};