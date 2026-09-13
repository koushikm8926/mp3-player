/**
 * `expo-sqlite` stand-in backed by Node's built-in SQLite, so repository tests run real SQL.
 * Every `openDatabaseAsync` call gets a fresh in-memory database.
 */
const { DatabaseSync } =
  typeof process.getBuiltinModule === 'function'
    ? process.getBuiltinModule('node:sqlite')
    : require('node:sqlite');

const bind = (params) => (params == null ? [] : Array.isArray(params) ? params : [params]);
const plain = (row) => (row ? { ...row } : null);

function wrap(db) {
  return {
    execAsync: async (sql) => {
      db.exec(sql);
    },
    getFirstAsync: async (sql, params) => plain(db.prepare(sql).get(...bind(params))),
    getAllAsync: async (sql, params) => db.prepare(sql).all(...bind(params)).map(plain),
    runAsync: async (sql, params) => {
      const result = db.prepare(sql).run(...bind(params));
      return { lastInsertRowId: Number(result.lastInsertRowid), changes: Number(result.changes) };
    },
    withTransactionAsync: async (task) => {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    closeAsync: async () => db.close(),
  };
}

module.exports = {
  openDatabaseAsync: async () => wrap(new DatabaseSync(':memory:')),
};
