import pool from '../config/db.js';

async function migrate() {
  console.log('🚀 Iniciando Migration: KPI Snapshot Engine...');
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_quality.kpi_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        period_start TIMESTAMP WITH TIME ZONE NOT NULL,
        period_end TIMESTAMP WITH TIME ZONE NOT NULL,
        metrics JSONB NOT NULL, -- { total, bySeverity, byStatus, leadTimeAvg, etc }
        audit_status VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT, AUDITED, PUBLISHED
        audit_log JSONB, -- { auditedBy, auditedAt, checksum }
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Proteção de Imutabilidade (Soft): Trigger para impedir alteração em Snapshots Auditados
      CREATE OR REPLACE FUNCTION audit_quality.protect_audited_snapshots()
      RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.audit_status = 'AUDITED' OR OLD.audit_status = 'PUBLISHED' THEN
          RAISE EXCEPTION 'HFC-03: Imutabilidade violada. Snapshots auditados não podem ser alterados.';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_protect_snapshots ON audit_quality.kpi_snapshots;
      CREATE TRIGGER trg_protect_snapshots
      BEFORE UPDATE ON audit_quality.kpi_snapshots
      FOR EACH ROW EXECUTE FUNCTION audit_quality.protect_audited_snapshots();
    `);
    console.log('✅ Infraestrutura de Snapshots pronta e protegida por Triggers.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro na migration de snapshots:', err.message);
    process.exit(1);
  }
}

migrate();
