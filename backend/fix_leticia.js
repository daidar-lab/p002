import pool from './src/config/db.js';

async function fix() {
  try {
    await pool.query("UPDATE audit_quality.users SET email = NULL WHERE username = 'lferreira'");
    console.log('✅ E-mail da Letícia removido.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fix();
