import pool from './src/config/db.js';

async function fix() {
  try {
    // 1. Remove a trava antiga de perfis
    await pool.query('ALTER TABLE audit_quality.users DROP CONSTRAINT IF EXISTS users_role_check');
    
    // 2. Adiciona a nova trava com todos os perfis técnicos e administrativos
    await pool.query(`
      ALTER TABLE audit_quality.users ADD CONSTRAINT users_role_check 
      CHECK (role IN (
        'admin', 'gestor', 
        'QUALITY_ANALYST', 'QUALITY_COORDINATOR', 
        'CGI', 'LOGISTICS', 'PCP'
      ))
    `);
    
    console.log('✅ Matriz de perfis de usuário atualizada no banco.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fix();
