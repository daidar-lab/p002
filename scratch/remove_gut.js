import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'auditquality',
  password: 'Bugatti2005',
  port: 5432,
});

async function removeGUT() {
  try {
    console.log('--- Iniciando Remoção da Escala GUT ---');
    await pool.query(`
      ALTER TABLE audit_quality.documents 
      DROP COLUMN IF EXISTS gut_gravity, 
      DROP COLUMN IF EXISTS gut_urgency, 
      DROP COLUMN IF EXISTS gut_tendency;
    `);
    console.log('✅ Colunas GUT removidas com sucesso no banco de dados.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
}

removeGUT();
