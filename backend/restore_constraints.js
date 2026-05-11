import pool from './src/config/db.js';

async function restore() {
  try {
    await pool.query('ALTER TABLE audit_quality.documents DROP CONSTRAINT IF EXISTS documents_status_check');
    await pool.query(`
      ALTER TABLE audit_quality.documents ADD CONSTRAINT documents_status_check 
      CHECK (status IN (
        'ABERTO', 'EM_ANALISE', 'ENVIADO_FORNECEDOR', 
        'AGUARDANDO_ASSINATURAS', 'AGUARDANDO_DISPOSICAO', 
        'CONCLUIDO', 'CANCELADO'
      ))
    `);
    console.log('✅ Governança de status RESTAURADA com sucesso.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

restore();
