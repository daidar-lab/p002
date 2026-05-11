import pool from './src/config/db.js';

async function checkSchema() {
  try {
    const res = await pool.query(`
      SELECT table_name, column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'audit_quality' 
      AND (table_name = 'documents' OR table_name = 'status_history')
      AND (column_name = 'status' OR column_name = 'old_status' OR column_name = 'new_status');
    `);
    console.table(res.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkSchema();
