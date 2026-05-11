import pool from './src/config/db.js';

async function check() {
  const query = `
    SELECT table_name, column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_schema = 'audit_quality' 
      AND table_name IN ('root_cause_analyses', 'capas', 'capa_evidences')
    ORDER BY table_name, column_name
  `;
  const res = await pool.query(query);
  console.table(res.rows);
  process.exit(0);
}

check();
