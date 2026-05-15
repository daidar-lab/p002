import pool from './src/config/db.js';

async function run() {
  try {
    console.log('Alterando coluna numero_rhe para TEXT...');
    await pool.query('ALTER TABLE audit_quality.rhes ALTER COLUMN numero_rhe TYPE TEXT');
    console.log('Sucesso!');
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    process.exit();
  }
}

run();
