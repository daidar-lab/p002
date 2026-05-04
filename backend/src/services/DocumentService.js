import DocumentRepository from '../repositories/DocumentRepository.js';
import pool from '../config/db.js';

class DocumentService {
  async listDashboard() {
    return await DocumentRepository.getAllWithSuppliers();
  }

  async create(data) {
    const {
      code,
      type = 'RNC',
      status = 'ABERTO',
      supplier_id = null,
      item_description,
      defect_category = 'QUALIDADE'
    } = data;

    if (!code || !item_description) {
      return {
        error: true,
        status: 400,
        message: 'Código e descrição são obrigatórios.'
      };
    }

    try {
      const result = await pool.query(
        `INSERT INTO documents (
          code, type, status, supplier_id,
          item_description, defect_category, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING *`,
        [code, type, status, supplier_id || null, item_description, defect_category]
      );

      return { data: result.rows[0] };
    } catch (err) {
      return this._handleDbError(err);
    }
  }

  async update(documentId, data) {
    const {
      code, type, status, supplier_id,
      item_description, defect_category,
      gut_gravity, gut_urgency, gut_tendency
    } = data;

    try {
      const result = await pool.query(
        `UPDATE documents SET
          code             = COALESCE($1, code),
          type             = COALESCE($2, type),
          status           = COALESCE($3, status),
          supplier_id      = COALESCE($4, supplier_id),
          item_description = COALESCE($5, item_description),
          defect_category  = COALESCE($6, defect_category),
          gut_gravity      = COALESCE($7, gut_gravity),
          gut_urgency      = COALESCE($8, gut_urgency),
          gut_tendency     = COALESCE($9, gut_tendency),
          updated_at       = NOW()
        WHERE id = $10
        RETURNING *`,
        [
          code, type, status,
          supplier_id || null,
          item_description, defect_category,
          gut_gravity, gut_urgency, gut_tendency,
          documentId
        ]
      );

      if (result.rowCount === 0) {
        return { error: true, status: 404, message: 'Documento não encontrado.' };
      }

      return { data: result.rows[0] };
    } catch (err) {
      return this._handleDbError(err);
    }
  }

  async delete(documentId) {
    try {
      const result = await pool.query(
        'DELETE FROM documents WHERE id = $1 RETURNING id',
        [documentId]
      );

      if (result.rowCount === 0) {
        return { error: true, status: 404, message: 'Documento não encontrado.' };
      }

      return { data: { deleted: true, id: documentId } };
    } catch (err) {
      return this._handleDbError(err);
    }
  }

  async changeStatus(documentId, newStatus) {
    const VALID = ['ABERTO', 'EM_ANALISE', 'ENVIADO_FORNECEDOR', 'CONCLUIDO', 'CANCELADO'];
    if (!VALID.includes(newStatus)) {
      return { error: true, status: 400, message: `Status inválido. Use: ${VALID.join(', ')}` };
    }

    try {
      const result = await pool.query(
        'UPDATE documents SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [newStatus, documentId]
      );

      if (result.rowCount === 0) {
        return { error: true, status: 404, message: 'Documento não encontrado.' };
      }

      return { data: result.rows[0] };
    } catch (err) {
      return this._handleDbError(err);
    }
  }

  async getTimeline(documentId) {
    const timeline = await DocumentRepository.getTimeline(documentId);
    return { data: timeline };
  }

  _handleDbError(err) {
    console.error('DB ERROR:', err.code, err.message);

    if (err.code === 'P0001') {
      return { error: true, status: 409, message: err.message };
    }
    if (err.code === '23514') {
      return { error: true, status: 422, message: 'Campos obrigatórios não informados para este tipo de documento.' };
    }
    if (err.code === '23502') {
      return { error: true, status: 422, message: 'Campo obrigatório está vazio.' };
    }
    if (err.code === '23503') {
      return { error: true, status: 400, message: 'Fornecedor inválido ou inexistente.' };
    }
    if (err.code === '23505') {
      return { error: true, status: 409, message: 'Já existe um documento com este código.' };
    }

    return { error: true, status: 500, message: 'Erro interno ao processar a solicitação.' };
  }
}

export default new DocumentService();
