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
      // Adicionado prefixo audit_quality para evitar colisões de esquema
      const result = await pool.query(
        `INSERT INTO audit_quality.documents (
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
        `UPDATE audit_quality.documents SET
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
        'DELETE FROM audit_quality.documents WHERE id = $1 RETURNING id',
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

  async changeStatus(documentId, newStatus, changedBy = 'sistema') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Busca status atual
      const currentDoc = await client.query(
        'SELECT status FROM audit_quality.documents WHERE id = $1', 
        [documentId]
      );
      
      if (currentDoc.rowCount === 0) {
        await client.query('ROLLBACK');
        return { error: true, status: 404, message: 'Documento não encontrado.' };
      }
      
      const oldStatus = currentDoc.rows[0].status;

      // 2. Atualiza o documento
      await client.query(
        'UPDATE audit_quality.documents SET status = $1, updated_at = NOW() WHERE id = $2',
        [newStatus, documentId]
      );

      // 3. Grava no histórico (A base da sua Timeline)
      await client.query(
        `INSERT INTO audit_quality.status_history (document_id, old_status, new_status, changed_by) 
         VALUES ($1, $2, $3, $4)`,
        [documentId, oldStatus, newStatus, changedBy]
      );

      await client.query('COMMIT');
      return { error: false };
    } catch (err) {
      await client.query('ROLLBACK');
      return { error: true, message: err.message };
    } finally {
      // Liberação única e limpa do cliente
      client.release();
    }
  }

  async getTimeline(documentId) {
    // Busca os dados unificados (Status + E-mails) do Repositório
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