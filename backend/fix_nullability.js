import pool from './src/config/db.js';

async function fix() {
  try {
    // Permite nulo na coluna user_id para que o despacho funcione
    await pool.query('ALTER TABLE audit_quality.signatures ALTER COLUMN user_id DROP NOT NULL');
    
    console.log('✅ Coluna user_id agora permite valores nulos (Assinaturas Pendentes).');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fix();
