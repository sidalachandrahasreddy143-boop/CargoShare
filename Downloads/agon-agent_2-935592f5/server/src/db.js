'use strict';
const { Pool } = require('pg');
const cfg = require('./config');

const pool = new Pool({
  connectionString: cfg.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => console.error('[db] idle client error', err));

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  /** Run fn inside a transaction; commits on success, rolls back on throw. */
  async withTransaction(fn) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};
