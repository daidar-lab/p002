import pool from '../config/db.js';

async function migrate() {
  console.log('🚀 Iniciando Migration: BR-IN15-01 — SLA de Resposta do Fornecedor...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Adiciona coluna para controle de SLA do Fornecedor
    console.log('📑 Adicionando sent_to_supplier_at e last_notification_at à tabela documents...');
    await client.query(`
      ALTER TABLE audit_quality.documents 
      ADD COLUMN IF NOT EXISTS sent_to_supplier_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS last_notification_at TIMESTAMP WITH TIME ZONE;
    `);

    // 2. Comentário para documentação da regra
    await client.query(`
      COMMENT ON COLUMN audit_quality.documents.sent_to_supplier_at 
      IS 'Data de início do SLA de 10 dias úteis para resposta do fornecedor (BR-IN15-01).';
    `);

    await client.query('COMMIT');
    console.log('✅ BR-IN15-01: Infraestrutura de SLA do Fornecedor preparada.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro na migration BR-IN15-01:', err.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrate();
