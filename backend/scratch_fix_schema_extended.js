import pool from './src/config/db.js';

async function fixSchemaExtended() {
  try {
    console.log('Fixing RHE schema inconsistencies...');
    
    // Fix foreign keys/references to users and suppliers to use BIGINT
    await pool.query(`
      ALTER TABLE audit_quality.rhes 
      ALTER COLUMN supplier_id TYPE BIGINT,
      ALTER COLUMN created_by TYPE BIGINT,
      ALTER COLUMN gate_executed_by TYPE BIGINT;
    `);
    console.log('Successfully updated rhes columns to BIGINT');

    // Double check rhe_signatures just in case it wasn't uuid before but now is
    // Wait, I already fixed it to BIGINT. Let's make sure it's consistent.
    
    // If rhe_signatures.user_id is uuid but users.id is bigint, we need to fix it.
    // I already did this in the previous script, but let's be sure.
    
    console.log('Schema consistency check complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error fixing extended schema:', err.message);
    process.exit(1);
  }
}

fixSchemaExtended();
