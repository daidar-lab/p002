import pool from './src/config/db.js';

async function check() {
  try {
    const res = await pool.query('SELECT code, severity, supplier_id FROM audit_quality.documents ORDER BY created_at DESC LIMIT 5');
    console.table(res.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
