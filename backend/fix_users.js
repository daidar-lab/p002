import pool from './src/config/db.js';

async function fix() {
  try {
    // 1. Atualiza 'gestor' para o perfil oficial e seu e-mail de teste
    await pool.query("UPDATE audit_quality.users SET role = 'QUALITY_COORDINATOR', email = 'surftrack.davi@gmail.com' WHERE username = 'gestor'");

    // 2. Atualiza 'lferreira' para outro perfil oficial
    await pool.query("UPDATE audit_quality.users SET role = 'QUALITY_ANALYST' WHERE username = 'lferreira'");

    console.log('✅ Usuários alinhados com os perfis do Workflow BR-07.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fix();
