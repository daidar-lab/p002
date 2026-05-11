import pool from './src/config/db.js';

async function check() {
  const query = `
    SELECT conname, pg_get_constraintdef(oid) as definition
    FROM pg_constraint 
    WHERE conname LIKE 'capas_%'
  `;
  const res = await pool.query(query);
  console.table(res.rows);
  process.exit(0);
}

check();
