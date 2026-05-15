import fs from 'node:fs';
import pool from './src/config/db.js';

async function checkSchema() {
  try {
    const res = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'audit_quality'
      ORDER BY table_name, ordinal_position
    `);
    fs.writeFileSync('schema.json', JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkSchema();
