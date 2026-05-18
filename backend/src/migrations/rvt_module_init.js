import pool from '../config/db.js';

async function migrate() {
  console.log('🚀 Iniciando Migration: Módulo RVT (Registro de Visita Técnica)...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Extensão do Escopo de Magic Link
    console.log('🔗 Atualizando escopos de Magic Link...');
    await client.query(`
      ALTER TYPE audit_quality.magic_link_scope ADD VALUE IF NOT EXISTS 'RVT_SCHEDULING';
      ALTER TYPE audit_quality.magic_link_scope ADD VALUE IF NOT EXISTS 'RVT_SIGNATURE';
    `);

    // 2. Tabela Principal de RVT
    console.log('📋 Criando tabela audit_quality.rvts...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_quality.rvts (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        supplier_id BIGINT NOT NULL REFERENCES audit_quality.suppliers(id),
        status VARCHAR(30) NOT NULL DEFAULT 'PENDENTE' 
          CHECK (status IN ('PENDENTE', 'AGENDADA', 'EM_VISITA', 'FINALIZADA', 'ASSINADA')),
        
        -- Agendamento
        scheduled_date DATE,
        window_start DATE,
        window_end DATE,
        
        -- Conteúdo Técnico
        product_name TEXT,
        visit_date DATE,
        pauta TEXT,
        subjects_covered TEXT, 
        conclusion TEXT, 
        
        -- Auditoria
        created_by BIGINT REFERENCES audit_quality.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ,
        finalized_at TIMESTAMPTZ,
        finalized_by BIGINT REFERENCES audit_quality.users(id)
      );
    `);

    // 3. Tabela de Participantes
    console.log('👥 Criando tabela audit_quality.rvt_participants...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_quality.rvt_participants (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        rvt_id BIGINT NOT NULL REFERENCES audit_quality.rvts(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        company VARCHAR(255) 
      );
    `);

    // 4. Tabela de Evidências (Fotos)
    console.log('📸 Criando tabela audit_quality.rvt_evidences...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_quality.rvt_evidences (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        rvt_id BIGINT NOT NULL REFERENCES audit_quality.rvts(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 5. Tabela de Vínculos com RNC (N:N)
    console.log('🔗 Criando tabela audit_quality.rvt_links...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_quality.rvt_links (
        rvt_id BIGINT NOT NULL REFERENCES audit_quality.rvts(id) ON DELETE CASCADE,
        document_id BIGINT NOT NULL REFERENCES audit_quality.documents(id) ON DELETE CASCADE,
        PRIMARY KEY (rvt_id, document_id)
      );
    `);

    // 6. Tabela de Assinaturas RVT
    console.log('🖊️ Criando tabela audit_quality.rvt_signatures...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_quality.rvt_signatures (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        rvt_id BIGINT NOT NULL REFERENCES audit_quality.rvts(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL, 
        user_id BIGINT REFERENCES audit_quality.users(id),
        signer_name VARCHAR(255),
        signed_at TIMESTAMPTZ,
        status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SIGNED')),
        signature_hash TEXT,
        UNIQUE(rvt_id, role)
      );
    `);

    // 7. Modificação na tabela magic_links para suportar RVT (opcionalidade de document_id)
    console.log('🛠️ Ajustando magic_links para suportar RVT...');
    await client.query(`
      ALTER TABLE audit_quality.magic_links ALTER COLUMN document_id DROP NOT NULL;
      ALTER TABLE audit_quality.magic_links ADD COLUMN IF NOT EXISTS rvt_id BIGINT REFERENCES audit_quality.rvts(id) ON DELETE CASCADE;
    `);

    await client.query('COMMIT');
    console.log('✅ Módulo RVT: Estrutura de dados preparada com sucesso.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro na migration RVT:', err.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrate();
