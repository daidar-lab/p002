import pool from './src/config/db.js';

async function update() {
  try {
    // 1. Atualiza Tipos de CAPA (Adiciona PREDICTIVE)
    await pool.query(`ALTER TABLE audit_quality.capas DROP CONSTRAINT IF EXISTS capas_type_check`);
    await pool.query(`
      ALTER TABLE audit_quality.capas 
      ADD CONSTRAINT capas_type_check 
      CHECK (type = ANY (ARRAY['CORRECTIVE', 'PREVENTIVE', 'PREDICTIVE']::text[]))
    `);

    // 2. Atualiza Status de CAPA (Adiciona IMPLEMENTADO e EM_ANDAMENTO)
    await pool.query(`ALTER TABLE audit_quality.capas DROP CONSTRAINT IF EXISTS capas_status_check`);
    await pool.query(`
      ALTER TABLE audit_quality.capas 
      ADD CONSTRAINT capas_status_check 
      CHECK (status = ANY (ARRAY['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO', 'IMPLEMENTADO', 'CANCELADO']::text[]))
    `);

    console.log('Banco de dados atualizado com sucesso para novos padrões!');
    process.exit(0);
  } catch (err) {
    console.error('Erro ao atualizar banco:', err.message);
    process.exit(1);
  }
}

update();
