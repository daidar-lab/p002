import pool from './src/config/db.js';

async function mapSchema() {
  try {
    const res = await pool.query(`
      SELECT 
        n.nspname as schema_name,
        t.relname as table_name,
        c.conname as constraint_name,
        pg_get_constraintdef(c.oid) as definition
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_namespace n ON t.relnamespace = n.oid
      WHERE c.conname LIKE '%status_check%';
    `);
    console.table(res.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

mapSchema();
