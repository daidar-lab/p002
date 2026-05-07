import pool from '../config/db.js';

class DocumentRepository {
  async getAllWithSuppliers() {
    const query = `
      SELECT
        d.id,
        d.code,
        d.type,
        d.status,
        d.item_description,
        d.defect_category,
        d.supplier_id,
        s.name   AS supplier_name,
        s.email  AS supplier_email,
        d.gut_gravity,
        d.gut_urgency,
        d.gut_tendency,
        (d.gut_gravity * d.gut_urgency * d.gut_tendency) AS gut_score,
        d.created_at,
        d.updated_at
      FROM audit_quality.documents d
      LEFT JOIN audit_quality.suppliers s ON d.supplier_id = s.id
      ORDER BY d.created_at DESC
    `;
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar documentos:', error.message);
      throw error;
    }
  }

  async getById(id) {
    const query = `
      SELECT
        d.*,
        s.name  AS supplier_name,
        s.email AS supplier_email,
        (d.gut_gravity * d.gut_urgency * d.gut_tendency) AS gut_score
      FROM audit_quality.documents d
      LEFT JOIN audit_quality.suppliers s ON d.supplier_id = s.id
      WHERE d.id = $1
    `;
    try {
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error(`Erro ao buscar documento ${id}:`, error.message);
      throw error;
    }
  }

  // No seu DocumentRepository.js, substitua o getTimeline:
  async getTimeline(documentId) {
    const query = `
      -- Parte 1: Mudanças de Status (Mapeado para o seu t.action e t.detail)
      SELECT 
        created_at,
        'Status alterado para ' || new_status AS action,
        'De: ' || COALESCE(old_status, 'Aberto') || ' ➔ Para: ' || new_status AS detail,
        changed_by AS user_name
      FROM audit_quality.status_history
      WHERE document_id = $1

      UNION ALL

      -- Parte 2: Envios de E-mail
      SELECT 
        sent_at AS created_at,
        'E-mail enviado: ' || subject AS action,
        'Destinatário: ' || recipient || ' | Status: ' || status AS detail,
        triggered_by AS user_name
      FROM audit_quality.email_logs
      WHERE document_id = $1

      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [documentId]);
    return result.rows;
  }

  /**
   * Busca RAQs válidas para o motor de reincidência (BR-05)
   */
  async findValidRAQsForRecurrence(supplier_id, defect_category) {
    const query = `
      SELECT id, code, created_at
      FROM audit_quality.documents
      WHERE supplier_id = $1
        AND defect_category = $2
        AND type = 'RAQ'
        AND status != 'CANCELADO'
        AND created_at >= NOW() - INTERVAL '12 months'
      ORDER BY created_at ASC
    `;
    const result = await pool.query(query, [supplier_id, defect_category]);
    return result.rows;
  }

  /**
   * Vincula logicamente uma lista de RAQs a um RNC pai (evidências)
   */
  async linkRAQsToParentRNC(rnc_id, raq_ids) {
    const query = `
      UPDATE audit_quality.documents
      SET parent_doc_id = $1
      WHERE id = ANY($2)
    `;
    await pool.query(query, [rnc_id, raq_ids]);
  }
}

export default new DocumentRepository();
