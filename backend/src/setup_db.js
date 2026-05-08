import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const sqlFiles = [
  'schema.sql',
  'schema_users.sql',
  'acr_schema.sql',
  'capa_schema.sql',
  'efficacy_schema.sql',
  'portal_schema.sql',
  'signatures_schema.sql',
  'report_schema.sql',
  'audit_process_schema.sql',
  'notification_matrix_schema.sql'
];

async function setup() {
  console.log('🚀 Iniciando Setup Hardened do Banco de Dados...');
  
  const client = await pool.connect();
  try {
    for (const file of sqlFiles) {
      console.log(`📑 Executando ${file}...`);
      const filePath = path.join(__dirname, '../../db', file);
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ Arquivo ${file} não encontrado, pulando...`);
        continue;
      }
      const sql = fs.readFileSync(filePath, 'utf8');
      await client.query(sql);
    }
    console.log('✅ Banco de Dados configurado com SUCESSO!');
  } catch (err) {
    console.error('❌ Erro durante o setup:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

setup();
