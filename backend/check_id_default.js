import pool from './src/config/db.js';

async function check() {
  try {
    const res = await pool.query(`
      SELECT column_name, column_default
      FROM information_schema.columns
      WHERE table_schema = 'audit_quality' AND table_name = 'signatures' AND column_name = 'id';
    `);
    console.table(res.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
