import pool from '../config/db.js';

async function migrate() {
  console.log('🚀 Iniciando Migration: Alterando product_name para TEXT...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('🛠️ Alterando coluna product_name na tabela audit_quality.rvts...');
    await client.query(`
      ALTER TABLE audit_quality.rvts ALTER COLUMN product_name TYPE TEXT;
    `);

    await client.query('COMMIT');
    console.log('✅ Coluna product_name alterada com sucesso para TEXT.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro na migration:', err.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrate();
