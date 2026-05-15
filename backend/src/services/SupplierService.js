import pool from '../config/db.js';

class SupplierService {
  async listAll(params = {}) {
    const { page = 1, limit = 20, search = '' } = params;
    const offset = (page - 1) * limit;
    const values = [];
    
    let query = `
      SELECT id, name, cnpj, contact_name, email, active, created_at,
             COUNT(*) OVER() as total_count
      FROM audit_quality.suppliers
      WHERE 1=1
    `;

    if (search) {
      values.push(`%${search}%`);
      query += ` AND (name ILIKE $${values.length} OR cnpj ILIKE $${values.length})`;
    }

    query += ` ORDER BY name ASC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    try {
      const result = await pool.query(query, values);
      const rows = result.rows;
      const total = rows.length > 0 ? parseInt(rows[0].total_count) : 0;

      return { 
        data: rows,
        total,
        page: parseInt(page),
        limit: parseInt(limit)
      };
    } catch (err) {
      return this._handleDbError(err);
    }
  }

  async create(data) {
    const { name, cnpj, contact_name, email, active = true } = data;

    if (!name) {
      return { error: true, status: 400, message: 'Razão social é obrigatória.' };
    }

    try {
      const result = await pool.query(
        `INSERT INTO audit_quality.suppliers (name, cnpj, contact_name, email, active, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [name, cnpj || null, contact_name || null, email || null, active]
      );
      return { data: result.rows[0] };
    } catch (err) {
      return this._handleDbError(err);
    }
  }

  async update(id, data) {
    const { name, cnpj, contact_name, email, active } = data;

    try {
      const result = await pool.query(
        `UPDATE audit_quality.suppliers SET
          name         = COALESCE($1, name),
          cnpj         = COALESCE($2, cnpj),
          contact_name = COALESCE($3, contact_name),
          email        = COALESCE($4, email),
          active       = COALESCE($5, active),
          updated_at   = NOW()
        WHERE id = $6
        RETURNING *`,
        [name, cnpj, contact_name, email, active, id]
      );

      if (result.rowCount === 0) {
        return { error: true, status: 404, message: 'Fornecedor não encontrado.' };
      }

      return { data: result.rows[0] };
    } catch (err) {
      return this._handleDbError(err);
    }
  }

  async delete(id) {
    try {
      const result = await pool.query(
        'DELETE FROM audit_quality.suppliers WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rowCount === 0) {
        return { error: true, status: 404, message: 'Fornecedor não encontrado.' };
      }

      return { data: { deleted: true, id } };
    } catch (err) {
      return this._handleDbError(err);
    }
  }

  _handleDbError(err) {
    console.error('SUPPLIER DB ERROR:', err.code, err.message);

    if (err.code === '23505') {
      return { error: true, status: 409, message: 'Já existe um fornecedor com este CNPJ.' };
    }
    if (err.code === '23503') {
      return { error: true, status: 409, message: 'Não é possível excluir: fornecedor possui documentos vinculados.' };
    }

    return { error: true, status: 500, message: 'Erro interno.' };
  }
}

export default new SupplierService();
