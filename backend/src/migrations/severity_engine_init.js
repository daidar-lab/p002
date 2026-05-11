import pool from '../config/db.js';

async function migrate() {
  console.log('🚀 Iniciando Migration: Severity Engine + GUT Removal...');
  try {
    await pool.query(`
      -- 1. Remoção Definitiva do GUT (Obsoleto)
      ALTER TABLE audit_quality.documents 
      DROP COLUMN IF EXISTS gut_gravity,
      DROP COLUMN IF EXISTS gut_urgency,
      DROP COLUMN IF EXISTS gut_tendency;

      -- 2. Adição da Coluna de Severidade Determinística
      ALTER TABLE audit_quality.documents 
      ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'LOW';

      -- 3. Campos de Contexto e Impacto (Base de Avaliação)
      ALTER TABLE audit_quality.documents 
      ADD COLUMN IF NOT EXISTS occurrence_context VARCHAR(20), -- PRODUCT, PROCESS, SUPPLIER, AUDIT
      ADD COLUMN IF NOT EXISTS audit_finding_type VARCHAR(20), -- MINOR, MAJOR
      ADD COLUMN IF NOT EXISTS impact_regulatory BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS impact_customer BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS impact_production BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS evaluation_log JSONB;

      COMMENT ON COLUMN audit_quality.documents.severity IS 'LOW, MEDIUM, HIGH, CRITICAL, NOT_APPLICABLE';
    `);
    console.log('✅ GUT removido e Motor de Severidade preparado.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro na migration de severidade:', err.message);
    process.exit(1);
  }
}

migrate();
