import pool from './src/config/db.js';

async function check() {
  const res = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'audit_quality' AND table_name = 'documents'
  `);
  console.table(res.rows);
  process.exit(0);
}
check();
