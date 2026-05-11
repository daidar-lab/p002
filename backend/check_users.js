import pool from './src/config/db.js';

async function check() {
  try {
    const res = await pool.query(`
      SELECT username, email, role, active 
      FROM audit_quality.users;
    `);
    console.table(res.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
