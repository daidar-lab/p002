import pool from './src/config/db.js';

async function migrate() {
  try {
    await pool.query(`
      ALTER TABLE audit_quality.rhes 
      ADD COLUMN IF NOT EXISTS parametros_recebimento_url TEXT;
    `);
    console.log('✅ Column parametros_recebimento_url added to rhes');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

migrate();
