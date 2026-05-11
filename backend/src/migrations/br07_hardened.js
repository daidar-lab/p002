import pool from '../config/db.js';

async function migrate() {
  console.log('🚀 Iniciando Migration BR-07 (Hardened v2)...');
  try {
    await pool.query(`
      -- 1. Garante que a tabela existe com a estrutura básica
      CREATE TABLE IF NOT EXISTS audit_quality.signatures (
        id SERIAL PRIMARY KEY,
        document_id INTEGER REFERENCES audit_quality.documents(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        user_id VARCHAR(100),
        signed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- 2. Adiciona campos de auditoria e SLA (Hardened)
      ALTER TABLE audit_quality.signatures 
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'PENDING',
      ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS escalation_level VARCHAR(20) DEFAULT 'NONE',
      ADD COLUMN IF NOT EXISTS state_hash VARCHAR(64);

      -- 3. HIR-07: Rejeição determinística de papéis duplicados (UNIQUE CONSTRAINT)
      -- Primeiro removemos duplicatas se existirem (limpeza preventiva)
      DELETE FROM audit_quality.signatures a USING audit_quality.signatures b
      WHERE a.id < b.id AND a.document_id = b.document_id AND a.role = b.role;

      -- Adiciona a restrição de unicidade
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_document_role') THEN
          ALTER TABLE audit_quality.signatures ADD CONSTRAINT uq_document_role UNIQUE (document_id, role);
        END IF;
      END $$;
    `);
    console.log('✅ Estrutura de Assinaturas atualizada para Missão Crítica.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro na migration BR-07:', err.message);
    process.exit(1);
  }
}

migrate();
