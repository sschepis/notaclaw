module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/lib/(.*)$': '<rootDir>/renderer/lib/$1',
    '^@/ui/(.*)$': '<rootDir>/renderer/ui/$1',
    '^@/components/(.*)$': '<rootDir>/renderer/components/$1'
  }
};
