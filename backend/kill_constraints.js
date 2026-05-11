import pool from './src/config/db.js';

async function kill() {
  try {
    await pool.query('ALTER TABLE audit_quality.documents DROP CONSTRAINT IF EXISTS documents_status_check');
    console.log('🔥 Restrição documents_status_check REMOVIDA. Tente salvar agora.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

kill();
