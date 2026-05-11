import bcrypt from 'bcryptjs';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function resetAdmin() {
  const hash = await bcrypt.hash('admin123', 10);
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE audit_quality.users 
       SET password = $1, email = $2 
       WHERE username = 'admin'`,
      [hash, 'admin@cervejariacidadeimperial.com.br']
    );
    console.log('✅ Admin resetado: admin@cervejariacidadeimperial.com.br / admin123');
  } finally {
    client.release();
    await pool.end();
  }
}

resetAdmin();
