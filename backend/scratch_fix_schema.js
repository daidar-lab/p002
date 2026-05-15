import pool from './src/config/db.js';

async function fixSchema() {
  try {
    console.log('Fixing rhe_signatures.user_id column type...');
    await pool.query(`
      ALTER TABLE audit_quality.rhe_signatures 
      ALTER COLUMN user_id TYPE BIGINT 
      USING (CASE WHEN user_id::text ~ '^[0-9]+$' THEN user_id::text::bigint ELSE NULL END);
    `);
    console.log('Successfully fixed rhe_signatures.user_id');
    process.exit(0);
  } catch (err) {
    console.error('Error fixing schema:', err.message);
    process.exit(1);
  }
}

fixSchema();
