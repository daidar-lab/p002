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
        d.severity,
        s.name   AS supplier_name,
        s.email  AS supplier_email,
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
        s.contact_name
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
      -- 1. Abertura do Documento
      SELECT 
        created_at,
        'Documento Criado' AS action,
        'O registro foi aberto no sistema sob o código: ' || code AS detail,
        'sistema' AS user_name
      FROM audit_quality.documents
      WHERE id = $1

      UNION ALL

      -- 2. Mudanças de Status
      SELECT 
        created_at,
        'Status alterado para ' || new_status AS action,
        'De: ' || COALESCE(old_status, 'Aberto') || ' ➔ Para: ' || new_status AS detail,
        changed_by AS user_name
      FROM audit_quality.status_history
      WHERE document_id = $1

      UNION ALL

      -- 3. Envios de E-mail
      SELECT 
        sent_at AS created_at,
        'E-mail enviado: ' || subject AS action,
        'Destinatário: ' || recipient || ' | Status: ' || status AS detail,
        triggered_by AS user_name
      FROM audit_quality.email_logs
      WHERE document_id = $1

      UNION ALL
      
      -- 4. Assinaturas Digitais (BR-07)
      SELECT 
        s.signed_at AS created_at,
        'Assinatura realizada: ' || s.role AS action,
        'Assinado digitalmente por: ' || u.name || ' (ID: ' || u.id || ')' AS detail,
        u.username AS user_name
      FROM audit_quality.signatures s
      JOIN audit_quality.users u ON u.id = s.user_id
      WHERE s.document_id = $1 AND s.status = 'SIGNED'

      UNION ALL

      -- 5. Análise de Causa Raiz (Portal do Fornecedor)
      SELECT 
        created_at,
        'Causa Raiz Identificada (' || type || ')' AS action,
        'Causa: ' || root_cause AS detail,
        'fornecedor' AS user_name
      FROM audit_quality.root_cause_analyses
      WHERE document_id = $1

      UNION ALL

      -- 6. Criação de CAPAs
      SELECT 
        created_at,
        'Plano de Ação (CAPA) Registrado' AS action,
        'Tipo: ' || type || ' | Descrição: ' || description AS detail,
        'fornecedor' AS user_name
      FROM audit_quality.capas
      WHERE document_id = $1

      UNION ALL

      -- 7. Evidências Técnicas (Vínculo com CAPA)
      SELECT 
        ce.created_at,
        'Evidência Submetida' AS action,
        'Descrição: ' || ce.description || ' | Objetivo: ' || (CASE WHEN ce.is_objective THEN 'Sim' ELSE 'Não' END) AS detail,
        'fornecedor' AS user_name
      FROM audit_quality.capa_evidences ce
      JOIN audit_quality.capas c ON c.id = ce.capa_id
      WHERE c.document_id = $1

      UNION ALL

      -- 8. Disposição de Material (Finalização)
      SELECT 
        disposition_at AS created_at,
        'Disposição de Material Realizada' AS action,
        'Decisão: ' || material_disposition AS detail,
        'gestor' AS user_name
      FROM audit_quality.documents
      WHERE id = $1 AND material_disposition IS NOT NULL

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
