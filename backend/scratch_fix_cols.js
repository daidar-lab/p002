import pool from './src/config/db.js';

async function fixCols() {
  try {
    console.log('Renaming columns in audit_quality.rhes to match code...');
    await pool.query(`
      ALTER TABLE audit_quality.rhes RENAME COLUMN quantidade_kg TO quantidade_recebida_kg;
      ALTER TABLE audit_quality.rhes RENAME COLUMN descricao_resultado TO resultados_descricao;
    `);
    console.log('Successfully renamed columns.');
    process.exit(0);
  } catch (err) {
    console.error('Error renaming columns:', err.message);
    process.exit(1);
  }
}

fixCols();
