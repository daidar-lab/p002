import pool from './src/config/db.js';

async function fix() {
  try {
    // 1. Remove a restrição antiga se existir
    await pool.query('ALTER TABLE audit_quality.documents DROP CONSTRAINT IF EXISTS documents_status_check');
    
    // 2. Adiciona a nova restrição com todos os status do novo workflow
    await pool.query(`
      ALTER TABLE audit_quality.documents ADD CONSTRAINT documents_status_check 
      CHECK (status IN (
        'ABERTO', 
        'EM_ANALISE', 
        'ENVIADO_FORNECEDOR', 
        'AGUARDANDO_ASSINATURAS', 
        'AGUARDANDO_DISPOSICAO', 
        'CONCLUIDO', 
        'CANCELADO'
      ))
    `);
    
    console.log('✅ Restrições de status atualizadas no banco de dados.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fix();
