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
        s.name AS supplier_name,
        d.gut_gravity,
        d.gut_urgency,
        d.gut_tendency,
        (d.gut_gravity * d.gut_urgency * d.gut_tendency) AS gut_score,
        d.created_at
      FROM audit_quality.documents d
      LEFT JOIN audit_quality.suppliers s ON d.supplier_id = s.id
      ORDER BY d.created_at DESC
    `; // Removido o ; interno para evitar conflitos no driver

    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error("Erro ao buscar documentos no DB:", error);
      throw error; // Repassa o erro para o server.js tratar
    }
  }

  async getTimeline(documentId) {
    const query = `
      SELECT * FROM audit_quality.audit_logs 
      WHERE document_id = $1 
      ORDER BY created_at DESC
    `; // Removido o ; interno
    
    try {
      const result = await pool.query(query, [documentId]);
      return result.rows;
    } catch (error) {
      console.error(`Erro ao buscar timeline do doc ${documentId}:`, error);
      throw error;
    }
  }
}

// Exportando a instância para manter o padrão que você usou no server.js[cite: 1]
export default new DocumentRepository();