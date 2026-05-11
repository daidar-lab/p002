import pool from '../config/db.js';

async function migrate() {
  console.log('🚀 Iniciando Migration BR-06...');
  try {
    await pool.query(`
      -- Colunas de Disposição
      ALTER TABLE audit_quality.documents 
      ADD COLUMN IF NOT EXISTS material_disposition VARCHAR(50),
      ADD COLUMN IF NOT EXISTS disposition_by VARCHAR(100),
      ADD COLUMN IF NOT EXISTS disposition_at TIMESTAMP;

      -- Tabela de Aprovações de Disposição
      CREATE TABLE IF NOT EXISTS audit_quality.disposition_approvals (
        id SERIAL PRIMARY KEY,
        document_id INTEGER REFERENCES audit_quality.documents(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL, -- COMEX, LOGISTICS, PCP, QUALITY_COORDINATOR
        approved_by VARCHAR(100) NOT NULL,
        reference_id VARCHAR(100), -- Financial reference ID para VR-04
        timestamp TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Migration BR-06 concluída com sucesso.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro na migration:', err.message);
    process.exit(1);
  }
}

migrate();
