import pool from '../config/db.js';

class RvtRepository {
  async create(data, client = pool) {
    const query = `
      INSERT INTO audit_quality.rvts (
        code, supplier_id, status, window_start, window_end, 
        product_name, visit_date, pauta, subjects_covered, conclusion, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const params = [
      data.code, data.supplier_id, data.status || 'PENDENTE',
      data.window_start || null, data.window_end || null, data.product_name,
      (!data.visit_date || data.visit_date === '') ? null : data.visit_date, 
      data.pauta, data.subjects_covered,
      data.conclusion, data.created_by
    ];
    const result = await client.query(query, params);
    return result.rows[0];
  }

  async getById(id) {
    const query = `
      SELECT r.*, s.name as supplier_name, s.email as supplier_email
      FROM audit_quality.rvts r
      JOIN audit_quality.suppliers s ON r.supplier_id = s.id
      WHERE r.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  async getAll(filters = {}) {
    let query = `
      SELECT r.*, s.name as supplier_name
      FROM audit_quality.rvts r
      JOIN audit_quality.suppliers s ON r.supplier_id = s.id
      WHERE 1=1
    `;
    const params = [];
    if (filters.supplier_id) {
      params.push(filters.supplier_id);
      query += ` AND r.supplier_id = $${params.length}`;
    }
    if (filters.status) {
      params.push(filters.status);
      query += ` AND r.status = $${params.length}`;
    }
    query += ' ORDER BY r.created_at DESC';
    const result = await pool.query(query, params);
    return result.rows;
  }

  async update(id, data, client = pool) {
    const fields = [];
    const params = [];
    Object.keys(data).forEach((key, index) => {
      fields.push(`${key} = $${index + 1}`);
      params.push(data[key]);
    });
    params.push(id);
    const query = `
      UPDATE audit_quality.rvts 
      SET ${fields.join(', ')}, updated_at = NOW() 
      WHERE id = $${params.length} 
      RETURNING *
    `;
    const result = await client.query(query, params);
    return result.rows[0];
  }

  // Participantes
  async addParticipant(rvt_id, name, company, client = pool) {
    await client.query(
      'INSERT INTO audit_quality.rvt_participants (rvt_id, name, company) VALUES ($1, $2, $3)',
      [rvt_id, name, company]
    );
  }

  async getParticipants(rvt_id) {
    const result = await pool.query(
      'SELECT * FROM audit_quality.rvt_participants WHERE rvt_id = $1',
      [rvt_id]
    );
    return result.rows;
  }

  async clearParticipants(rvt_id, client = pool) {
    await client.query('DELETE FROM audit_quality.rvt_participants WHERE rvt_id = $1', [rvt_id]);
  }

  // Evidências
  async addEvidence(rvt_id, url, description, client = pool) {
    await client.query(
      'INSERT INTO audit_quality.rvt_evidences (rvt_id, url, description) VALUES ($1, $2, $3)',
      [rvt_id, url, description]
    );
  }

  async getEvidences(rvt_id) {
    const result = await pool.query(
      'SELECT * FROM audit_quality.rvt_evidences WHERE rvt_id = $1',
      [rvt_id]
    );
    return result.rows;
  }

  // Vínculos RNC
  async linkRnc(rvt_id, document_id, client = pool) {
    await client.query(
      'INSERT INTO audit_quality.rvt_links (rvt_id, document_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [rvt_id, document_id]
    );
  }

  async getLinks(rvt_id) {
    const result = await pool.query(
      `SELECT d.id, d.code, d.type, d.status 
       FROM audit_quality.rvt_links rl
       JOIN audit_quality.documents d ON rl.document_id = d.id
       WHERE rl.rvt_id = $1`,
      [rvt_id]
    );
    return result.rows;
  }

  async clearLinks(rvt_id, client = pool) {
    await client.query('DELETE FROM audit_quality.rvt_links WHERE rvt_id = $1', [rvt_id]);
  }

  // Assinaturas
  async upsertSignature(data, client = pool) {
    const query = `
      INSERT INTO audit_quality.rvt_signatures (rvt_id, role, user_id, signer_name, status, signed_at, signature_hash)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (rvt_id, role) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        signer_name = EXCLUDED.signer_name,
        status = EXCLUDED.status,
        signed_at = EXCLUDED.signed_at,
        signature_hash = EXCLUDED.signature_hash
      RETURNING *
    `;
    const result = await client.query(query, [
      data.rvt_id, data.role, data.user_id, data.signer_name, 
      data.status || 'PENDING', data.signed_at, data.signature_hash
    ]);
    return result.rows[0];
  }

  async getSignatures(rvt_id) {
    const result = await pool.query(
      'SELECT * FROM audit_quality.rvt_signatures WHERE rvt_id = $1',
      [rvt_id]
    );
    return result.rows;
  }
}

export default new RvtRepository();
