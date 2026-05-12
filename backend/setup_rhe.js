import pool from './src/config/db.js';

async function setupRHE() {
  try {
    console.log('--- 🔍 Explorando Schema ---');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'audit_quality'
    `);
    console.log('Tabelas encontradas:', tables.rows.map(t => t.table_name).join(', '));

    console.log('\n--- 🛠️ Criando Tabelas RHE ---');
    
    // Tabela Principal RHE
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_quality.rhes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phase VARCHAR(20) NOT NULL CHECK (phase IN ('INITIAL', 'FINAL')),
        status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' 
          CHECK (status IN ('DRAFT', 'UNDER_REVIEW', 'INITIAL_APPROVED', 'FINAL_APPROVED', 'REPROVED')),
        object_type VARCHAR(20) NOT NULL CHECK (object_type IN ('SUPPLIER', 'PACKAGING')),
        supplier_id INTEGER REFERENCES audit_quality.suppliers(id),
        packaging_id VARCHAR(100), -- Placeholder se não existir tabela de embalagem
        production_line VARCHAR(100) NOT NULL,
        related_initial_rhe_id UUID REFERENCES audit_quality.rhes(id),
        created_by INTEGER REFERENCES audit_quality.users(id),
        gate_executed_by INTEGER REFERENCES audit_quality.users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        gate_executed_at TIMESTAMP WITH TIME ZONE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Tabela de Checklist RHE
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_quality.rhe_checklists (
        id SERIAL PRIMARY KEY,
        rhe_id UUID NOT NULL REFERENCES audit_quality.rhes(id) ON DELETE CASCADE,
        item_id VARCHAR(100) NOT NULL,
        approved BOOLEAN NOT NULL DEFAULT FALSE,
        evidence_ref TEXT,
        comment TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(rhe_id, item_id)
      )
    `);

    console.log('✅ Tabelas RHE criadas com sucesso!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro no setup RHE:', err.message);
    process.exit(1);
  }
}

setupRHE();
