import pool from '../config/db.js';

const RHE_PATCHABLE_COLUMNS = new Set([
  'status',
  'codigo_formulario',
  'titulo',
  'tipo_homologacao',
  'embalagem',
  'produto',
  'fornecedor',
  'data_fabricacao',
  'validade',
  'lote',
  'quantidade_recebida_kg',
  'nota_fiscal',
  'linha_envase',
  'versao',
  'unidade',
  'mes',
  'ano',
  'numero_rhe',
  'production_line',
  'data_emissao',
  'resultados_descricao',
  'data_recebimento',
  'data_teste',
  'linha_teste',
  'observacoes_tecnicas',
  'conclusao_resumo',
  'proxima_fase',
  'quantidade_requerida_kg',
  'conclusao_data',
  'parametros_recebimento_url',
  'gate_decision'
]);

class RheRepository {
  async create(data) {
    const query = `
      INSERT INTO audit_quality.rhes (
        phase, object_type, supplier_id, packaging_id, production_line, 
        related_initial_rhe_id, created_by, unidade, mes, ano, numero_rhe,
        titulo, tipo_homologacao, embalagem, produto, fornecedor, 
        data_fabricacao, validade, lote, quantidade_recebida_kg, 
        nota_fiscal, linha_envase, versao, codigo_formulario, 
        data_emissao, resultados_descricao, data_recebimento, data_teste, linha_teste, 
        observacoes_tecnicas, parametros_recebimento_url, conclusao_resumo,
        proxima_fase, quantidade_requerida_kg, conclusao_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35)
      RETURNING *
    `;
    const values = [
      data.phase, data.object_type, data.supplier_id, data.packaging_id, 
      data.production_line, data.related_initial_rhe_id, data.created_by,
      data.unidade, data.mes, data.ano, data.numero_rhe,
      data.titulo, data.tipo_homologacao,
      data.embalagem || null, data.produto || null, data.fornecedor || null,
      data.data_fabricacao || null, data.validade || null, data.lote || null,
      data.quantidade_recebida_kg || null, data.nota_fiscal || null,
      data.linha_envase || null, data.versao || null, data.codigo_formulario || null,
      data.data_emissao || null, data.resultados_descricao || null, 
      data.data_recebimento || null, data.data_teste || null, data.linha_teste || null, 
      data.observacoes_tecnicas || null, data.parametros_recebimento_url || null,
      data.conclusao_resumo || null, data.proxima_fase || null, 
      data.quantidade_requerida_kg || null, data.conclusao_data || null
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async getById(id) {
    const query = `
      SELECT r.*, s.name as supplier_name, u.name as creator_name, gu.name as gate_executor_name
      FROM audit_quality.rhes r
      LEFT JOIN audit_quality.suppliers s ON s.id = r.supplier_id
      LEFT JOIN audit_quality.users u ON u.id = r.created_by
      LEFT JOIN audit_quality.users gu ON gu.id = r.gate_executed_by
      WHERE r.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  async getByNumber(number) {
    const query = `
      SELECT r.*, s.name as supplier_name, u.name as creator_name, gu.name as gate_executor_name
      FROM audit_quality.rhes r
      LEFT JOIN audit_quality.suppliers s ON s.id = r.supplier_id
      LEFT JOIN audit_quality.users u ON u.id = r.created_by
      LEFT JOIN audit_quality.users gu ON gu.id = r.gate_executed_by
      WHERE r.numero_rhe = $1
      ORDER BY r.created_at DESC
      LIMIT 1
    `;
    const result = await pool.query(query, [number]);
    return result.rows[0];
  }

  async updateStatus(id, status, userId) {
    const query = `
      UPDATE audit_quality.rhes 
      SET status = $1, gate_executed_by = $2, gate_executed_at = NOW(), updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    const result = await pool.query(query, [status, userId, id]);
    return result.rows[0];
  }

  async executeGateUpdate(id, status, decision, userId) {
    const query = `
      UPDATE audit_quality.rhes 
      SET status = $1, gate_decision = $2, gate_executed_by = $3, gate_executed_at = NOW(), updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `;
    const result = await pool.query(query, [status, decision, userId, id]);
    return result.rows[0];
  }

  async saveChecklist(rheId, items) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const item of items) {
        const query = `
          INSERT INTO audit_quality.rhe_checklists (rhe_id, item_id, approved, evidence_ref, comment)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (rhe_id, item_id) DO UPDATE SET
            approved = EXCLUDED.approved,
            evidence_ref = EXCLUDED.evidence_ref,
            comment = EXCLUDED.comment
        `;
        await client.query(query, [rheId, item.item_id, item.approved, item.evidence_ref, item.comment]);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getChecklist(rheId) {
    const query = `SELECT * FROM audit_quality.rhe_checklists WHERE rhe_id = $1`;
    const result = await pool.query(query, [rheId]);
    return result.rows;
  }

  async getPhotosByRheId(rheId) {
    const query = `
      SELECT *
      FROM audit_quality.rhe_photos
      WHERE rhe_id = $1
      ORDER BY id
    `;
    const result = await pool.query(query, [rheId]);
    return result.rows;
  }

  async insertPhoto({ rhe_id, nome, url, descricao }, client = pool) {
    const query = `
      INSERT INTO audit_quality.rhe_photos (rhe_id, nome, url, descricao)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await client.query(query, [rhe_id, nome || null, url, descricao || null]);
    return result.rows[0];
  }

  async updatePhotoDescription(photoId, descricao) {
    const query = `UPDATE audit_quality.rhe_photos SET descricao = $1 WHERE id = $2 RETURNING *`;
    const result = await pool.query(query, [descricao, photoId]);
    return result.rows[0];
  }

  async deletePhoto(photoId) {
    const query = `DELETE FROM audit_quality.rhe_photos WHERE id = $1`;
    await pool.query(query, [photoId]);
  }

  async patchRhe(id, flatUpdates, client = pool) {
    const entries = Object.entries(flatUpdates).filter(
      ([k, v]) => RHE_PATCHABLE_COLUMNS.has(k) && v !== undefined
    );
    if (entries.length === 0) return this.getById(id);
    const sets = [];
    const vals = [];
    entries.forEach(([k, v], i) => {
      sets.push(`${k} = $${i + 1}`);
      vals.push(v);
    });
    vals.push(id);
    const q = `
      UPDATE audit_quality.rhes
      SET ${sets.join(', ')}, updated_at = NOW()
      WHERE id = $${vals.length}
      RETURNING *
    `;
    const result = await client.query(q, vals);
    if (result.rowCount === 0) return null;
    return this.getById(id);
  }

  async listRheSignatures(rheId) {
    const query = `
      SELECT rs.*, u.name AS user_name
      FROM audit_quality.rhe_signatures rs
      LEFT JOIN audit_quality.users u ON u.id = rs.user_id
      WHERE rs.rhe_id = $1
      ORDER BY rs.role
    `;
    const result = await pool.query(query, [rheId]);
    return result.rows;
  }

  async dispatchRheSignatures(rheId, roles, client = pool) {
    for (const role of roles) {
      try {
        await client.query(
          `INSERT INTO audit_quality.rhe_signatures (rhe_id, role, status) VALUES ($1, $2, 'PENDING')`,
          [rheId, role]
        );
      } catch (e) {
        if (e.code !== '23505') throw e;
      }
    }
  }

  async markRheSignatureSigned(rheId, role, userId, signatureHash, client = pool) {
    const query = `
      UPDATE audit_quality.rhe_signatures
      SET status = 'SIGNED',
          user_id = $1,
          signed_at = NOW(),
          signature_hash = $2
      WHERE rhe_id = $3 AND role = $4 AND status = 'PENDING'
      RETURNING *
    `;
    const result = await client.query(query, [userId, signatureHash, rheId, role]);
    return result.rows[0];
  }

  async list(filters = {}) {
    const { phase, supplier, status, limit = 10, offset = 0 } = filters;
    const values = [];
    let query = `
      SELECT r.*, s.name as supplier_name, COUNT(*) OVER() as total_count
      FROM audit_quality.rhes r
      LEFT JOIN audit_quality.suppliers s ON s.id = r.supplier_id
      WHERE 1=1
    `;

    if (phase) {
      values.push(phase);
      query += ` AND r.phase = $${values.length}`;
    }

    if (supplier) {
      values.push(`%${supplier}%`);
      query += ` AND s.name ILIKE $${values.length}`;
    }

    if (status) {
      values.push(status);
      query += ` AND r.status = $${values.length}`;
    }

    query += ` ORDER BY r.created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    return result.rows;
  }

  async getPendingByRole(role) {
    const query = `
      SELECT rs.*, r.numero_rhe, r.phase, r.codigo_formulario, s.name as supplier_name, r.id as rhe_id
      FROM audit_quality.rhe_signatures rs
      JOIN audit_quality.rhes r ON r.id = rs.rhe_id
      LEFT JOIN audit_quality.suppliers s ON s.id = r.supplier_id
      WHERE rs.status = 'PENDING' 
      AND (rs.role = $1::text OR $2::text = 'admin')
      AND r.status = 'UNDER_REVIEW'
      ORDER BY r.created_at ASC
    `;
    const result = await pool.query(query, [role, role]);
    return result.rows;
  }
}

export default new RheRepository();
