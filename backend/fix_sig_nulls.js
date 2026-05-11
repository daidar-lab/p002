import pool from './src/config/db.js';

async function fix() {
  try {
    await pool.query(`
      ALTER TABLE audit_quality.signatures 
      ALTER COLUMN signed_at DROP NOT NULL,
      ALTER COLUMN signature_hash DROP NOT NULL,
      ALTER COLUMN decision_uuid DROP NOT NULL;
    `);
    console.log('✅ Colunas de auditoria de assinatura agora permitem valores nulos (Prontas para despacho).');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fix();
