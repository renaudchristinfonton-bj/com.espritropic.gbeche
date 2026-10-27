/**
 * GBECHE — Configuration Jest (preset jest-expo).
 * Les modules Expo et React Native sont transformés par le preset ;
 * les modules natifs (haptics, secure store, reanimated…) sont mockés.
 */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.test.(ts|tsx)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'src/services/**/*.ts',
    'src/db/repositories/**/*.ts',
    'src/utils/**/*.ts',
    'src/components/ui/**/*.tsx',
  ],
};
