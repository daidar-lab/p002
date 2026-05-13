import pool from '../config/db.js';

async function migrate() {
  console.log('🚀 Iniciando Migration: BR-34 — Retenção Permanente e Performance...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Índices para Segmentação Temporal (Performance em Longo Prazo)
    console.log('📑 Criando índices de busca temporal...');
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_documents_created_at ON audit_quality.documents (created_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_status_history_created_at ON audit_quality.status_history (created_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_signatures_signed_at ON audit_quality.signatures (signed_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_efficacy_decisions_created_at ON audit_quality.efficacy_decisions (created_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_quality.audit_logs (created_at);`);

    // 2. Registro Formal da Política no Banco (Metadata/Comentários)
    await client.query(`COMMENT ON SCHEMA audit_quality IS 'Schema SGNC com política de retenção permanente BR-34. Proibido expurgo físico.';`);

    await client.query('COMMIT');
    console.log('✅ BR-34: Índices criados e política de retenção permanente formalizada.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro na migration BR-34:', err.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrate();
