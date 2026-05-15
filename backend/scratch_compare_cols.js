import pool from './src/config/db.js';

const RHE_PATCHABLE_COLUMNS = [
  'codigo_formulario', 'versao', 'data_emissao', 'unidade', 'mes', 'ano',
  'numero_rhe', 'titulo', 'tipo_homologacao', 'linha_envase', 'embalagem',
  'produto', 'fornecedor', 'data_fabricacao', 'validade', 'lote',
  'quantidade_recebida_kg', 'nota_fiscal', 'resultados_descricao',
  'data_recebimento', 'data_teste', 'linha_teste', 'observacoes_tecnicas',
  'conclusao_resumo', 'proxima_fase', 'quantidade_requerida_kg', 'production_line'
];

async function compare() {
  try {
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'audit_quality' AND table_name = 'rhes'
    `);
    const dbCols = new Set(res.rows.map(r => r.column_name));
    
    console.log('Missing columns in DB:');
    RHE_PATCHABLE_COLUMNS.forEach(c => {
      if (!dbCols.has(c)) {
        console.log(`- ${c}`);
      }
    });

    console.log('\nExtra columns in DB (potentially should be renamed):');
    dbCols.forEach(c => {
      if (!RHE_PATCHABLE_COLUMNS.includes(c) && !['id', 'phase', 'status', 'object_type', 'supplier_id', 'packaging_id', 'related_initial_rhe_id', 'created_by', 'gate_executed_by', 'created_at', 'gate_executed_at', 'updated_at'].includes(c)) {
        console.log(`- ${c}`);
      }
    });
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

compare();
