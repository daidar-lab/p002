import pool from './src/config/db.js';

async function fixExistingRhes() {
  try {
    const { rows: rhes } = await pool.query('SELECT * FROM audit_quality.rhes ORDER BY created_at ASC');
    console.log(`Found ${rhes.length} RHEs to fix.`);

    for (let i = 0; i < rhes.length; i++) {
      const rhe = rhes[i];
      const nextNum = i + 1;
      const isInitial = rhe.phase === 'INITIAL';
      const title = isInitial ? 'Homologação Inicial' : 'Homologação Final';
      const code = String(rhe.id).slice(0, 8).toUpperCase();
      
      const now = new Date(rhe.created_at);
      const mes = now.getMonth() + 1;
      const ano = Number(String(now.getFullYear()).slice(-2));

      await pool.query(`
        UPDATE audit_quality.rhes 
        SET numero_rhe = COALESCE(numero_rhe, $1),
            titulo = COALESCE(titulo, $2),
            tipo_homologacao = COALESCE(tipo_homologacao, $3),
            codigo_formulario = COALESCE(codigo_formulario, $4),
            mes = COALESCE(mes, $5),
            ano = COALESCE(ano, $6),
            unidade = COALESCE(unidade, 'Frutal'),
            data_emissao = COALESCE(data_emissao, created_at)
        WHERE id = $7
      `, [nextNum, title, title, code, mes, ano, rhe.id]);
      
      console.log(`Updated RHE ${rhe.id} with number ${nextNum} and title ${title}`);
    }
    
    console.log('✅ All existing RHEs updated.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixExistingRhes();
