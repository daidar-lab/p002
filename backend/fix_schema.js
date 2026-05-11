import pool from './src/config/db.js';

async function fix() {
  try {
    await pool.query(`
      ALTER TABLE audit_quality.status_history ALTER COLUMN old_status TYPE VARCHAR(50);
      ALTER TABLE audit_quality.status_history ALTER COLUMN new_status TYPE VARCHAR(50);
    `);
    console.log('✅ Colunas de status expandidas para 50 caracteres.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fix();
