/* Global test doubles for native modules the offline features sit on. */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// The repositories run real SQL against an in-memory SQLite database instead of a stub,
// so the tests exercise the actual schema, constraints and queries.
jest.mock('expo-sqlite', () => require('./src/__tests__/helpers/sqliteMock'));
