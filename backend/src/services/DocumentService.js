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
      status = 'CRIADO',
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
        `
        INSERT INTO documents (
          code,
          type,
          status,
          supplier_id,
          item_description,
          defect_category,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING *
        `,
        [
          code,
          type,
          status,
          supplier_id,
          item_description,
          defect_category
        ]
      );

      return { data: result.rows[0] };
    } catch (err) {
      return this._handleDbError(err);
    }
  }

  async changeStatus(documentId, newStatus) {
    try {
      const result = await pool.query(
        `
        UPDATE documents
        SET status = $1
        WHERE id = $2
        RETURNING *
        `,
        [newStatus, documentId]
      );

      return { data: result.rows[0] };
    } catch (err) {
      return this._handleDbError(err);
    }
  }

  async getTimeline(documentId) {
    const timeline = await DocumentRepository.getTimeline(documentId);
    return { data: timeline };
  }

  /* ============================
     PRIVATE – ERROR TRANSLATION
     ============================ */
  _handleDbError(err) {
    console.error('DB ERROR:', err);

    // Flow de status (RAISE EXCEPTION do trigger)
    if (err.code === 'P0001') {
      return {
        error: true,
        status: 409,
        message: err.message
      };
    }

    // CHECK constraint
    if (err.code === '23514') {
      return {
        error: true,
        status: 422,
        message: 'Campos obrigatórios não informados para este tipo de documento.'
      };
    }

    // NOT NULL
    if (err.code === '23502') {
      return {
        error: true,
        status: 422,
        message: 'Campo obrigatório está vazio.'
      };
    }

    // Foreign key (supplier inválido)
    if (err.code === '23503') {
      return {
        error: true,
        status: 400,
        message: 'Fornecedor inválido ou inexistente.'
      };
    }

    return {
      error: true,
      status: 500,
      message: 'Erro interno ao processar a solicitação.'
    };
  }
}

export default new DocumentService();s