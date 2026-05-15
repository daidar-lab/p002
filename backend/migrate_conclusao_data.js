import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'auditquality',
  password: 'Bugatti2005',
  port: 5432,
});

async function migrate() {
  try {
    console.log('Adicionando coluna conclusao_data...');
    await pool.query('ALTER TABLE audit_quality.rhes ADD COLUMN IF NOT EXISTS conclusao_data DATE;');
    console.log('Coluna adicionada com sucesso!');
  } catch (err) {
    console.error('Erro na migração:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
