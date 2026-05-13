import RvtRepository from '../repositories/RvtRepository.js';
import PortalService from './PortalService.js';
import MailService from './MailService.js';
import pool from '../config/db.js';

class RvtService {
  async list(filters) {
    return await RvtRepository.getAll(filters);
  }

  async getDetail(id) {
    const rvt = await RvtRepository.getById(id);
    if (!rvt) return null;

    return {
      ...rvt,
      participants: await RvtRepository.getParticipants(id),
      evidences: await RvtRepository.getEvidences(id),
      links: await RvtRepository.getLinks(id),
      signatures: await RvtRepository.getSignatures(id)
    };
  }

  async create(data, user = 'sistema') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Gera código (Ex: RVT-2026-001)
      const code = await this._generateNextCode();
      
      const rvtData = {
        ...data,
        code,
        status: data.window_start ? 'PENDENTE' : 'AGENDADA',
        created_by: data.user_id || null
      };

      const rvt = await RvtRepository.create(rvtData, client);

      // 1.5 Busca e-mail do fornecedor para notificação
      const resSupplier = await client.query('SELECT name, email FROM audit_quality.suppliers WHERE id = $1', [rvt.supplier_id]);
      const supplier = resSupplier.rows[0];

      // 2. Se houver janela, gera Magic Link de Agendamento
      if (data.window_start && data.window_end) {
        const magicLink = await PortalService.createMagicLink({
          rvt_id: rvt.id,
          supplier_id: rvt.supplier_id,
          scope: 'RVT_SCHEDULING',
          expires_at: new Date(data.window_end)
        }, client);

        // Notifica fornecedor (Async)
        MailService.sendRvtSchedulingRequest({
          rvt_code: rvt.code,
          supplier_email: supplier?.email,
          window_start: data.window_start,
          window_end: data.window_end,
          magic_link: `${process.env.FRONTEND_URL}/portal/rvt/${magicLink.token}`
        }).catch(err => console.error('Erro ao notificar fornecedor:', err.message));
      }

      // 3. Inicializa assinaturas vazias (Papéis obrigatórios)
      const roles = ['Controle de Qualidade', 'Gestão da Qualidade', 'Gerência', 'Representante Técnico'];
      for (const role of roles) {
        await RvtRepository.upsertSignature({ rvt_id: rvt.id, role, status: 'PENDING' }, client);
      }

      // 4. Registra Auditoria
      await client.query(
        `INSERT INTO audit_quality.audit_logs (document_id, rvt_id, action, detail, user_name)
         VALUES (NULL, $1, 'RVT Criado', $2, $3)`,
        [rvt.id, `Registro de Visita Técnica ${rvt.code} criado.`, user]
      );

      await client.query('COMMIT');
      return rvt;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async update(id, data, user = 'sistema') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const rvt = await RvtRepository.getById(id);

      const sanitizedData = {
        product_name: data.product_name,
        visit_date: (!data.visit_date || data.visit_date === '') ? null : data.visit_date,
        window_start: (!data.window_start || data.window_start === '') ? null : data.window_start,
        window_end: (!data.window_end || data.window_end === '') ? null : data.window_end,
        pauta: data.pauta,
        subjects_covered: data.subjects_covered,
        conclusion: data.conclusion
      };

      // Se já houver data da visita ou pauta, e o status for PENDENTE ou AGENDADA, move para EM_VISITA
      if ((sanitizedData.visit_date || sanitizedData.pauta) && (rvt.status === 'PENDENTE' || rvt.status === 'AGENDADA' || rvt.status === 'AGUARDANDO_EXECUCAO')) {
        sanitizedData.status = 'EM_VISITA';
      }

      // 1. Atualiza dados técnicos
      await RvtRepository.update(id, sanitizedData, client);

      // 2. Atualiza Participantes
      if (data.participants) {
        await RvtRepository.clearParticipants(id, client);
        for (const p of data.participants) {
          await RvtRepository.addParticipant(id, p.name, p.company, client);
        }
      }

      // 3. Atualiza Evidências (Apenas novas)
      if (data.evidences) {
        for (const e of data.evidences) {
          if (!e.id) await RvtRepository.addEvidence(id, e.url, e.description, client);
        }
      }

      // 4. Atualiza Vínculos RNC
      if (data.links) {
        await RvtRepository.clearLinks(id, client);
        for (const docId of data.links) {
          await RvtRepository.linkRnc(id, docId, client);
        }
      }

      await client.query(
        `INSERT INTO audit_quality.audit_logs (document_id, rvt_id, action, detail, user_name)
         VALUES (NULL, $1, 'RVT Atualizado', $2, $3)`,
        [id, `Registro de Visita Técnica ${rvt.code} atualizado.`, user]
      );

      await client.query('COMMIT');
      return await this.getDetail(id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async finalize(id, user = 'sistema') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const rvt = await RvtRepository.getById(id);
      
      await RvtRepository.update(id, { 
        status: 'FINALIZADA',
        finalized_at: new Date(),
        finalized_by: user === 'sistema' ? null : null // Precisaria do ID do usuário aqui
      }, client);

      // 1. Notifica Fornecedor para Assinatura (Magic Link)
      const magicLink = await PortalService.createMagicLink({
        rvt_id: id,
        supplier_id: rvt.supplier_id,
        scope: 'RVT_SIGNATURE',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias
      }, client);

      MailService.sendRvtSignatureRequest({
        rvt_code: rvt.code,
        supplier_email: rvt.supplier_email,
        magic_link: `${process.env.FRONTEND_URL}/portal/rvt/${magicLink.token}`
      }).catch(err => console.error('Erro ao notificar assinatura fornecedor:', err.message));

      // 2. Notifica Gestores Internos (Qualidade e Gerência) para Assinatura
      const rolesToNotify = ['Controle de Qualidade', 'Gestão da Qualidade', 'Gerência'];
      MailService.sendSignatureRequest({
        code: rvt.code,
        roles: rolesToNotify,
        document_id: null // RVT não é documento RNC
      }).catch(err => console.error('Erro ao notificar gestores para assinatura RVT:', err.message));

      await client.query(
        `INSERT INTO audit_quality.audit_logs (document_id, rvt_id, action, detail, user_name)
         VALUES (NULL, $1, 'RVT Finalizado', $2, $3)`,
        [id, `Relatório de Visita Técnica ${rvt.code} finalizado e enviado para assinaturas.`, user]
      );

      await client.query('COMMIT');
      return { success: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async signInternal(id, data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await RvtRepository.upsertSignature({
        rvt_id: id,
        role: data.role,
        user_id: data.user_id,
        signer_name: data.signer_name,
        status: 'SIGNED',
        signed_at: new Date(),
        signature_hash: `SHA256:INT:${Math.random().toString(36).substring(7)}`
      }, client);

      await this._checkCompletion(id, client);

      await client.query(
        `INSERT INTO audit_quality.audit_logs (document_id, rvt_id, action, detail, user_name)
         VALUES (NULL, $1, 'RVT Assinado Internamente', $2, $3)`,
        [id, `Assinatura digital coletada para o papel: ${data.role}`, data.signer_name]
      );

      await client.query('COMMIT');
      return { success: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async _checkCompletion(id, client = pool) {
    const signatures = await RvtRepository.getSignatures(id);
    const mandatoryRoles = ['Controle de Qualidade', 'Gestão da Qualidade', 'Gerência', 'Representante Técnico'];
    
    const allSigned = mandatoryRoles.every(role => 
      signatures.some(s => s.role === role && s.status === 'SIGNED')
    );

    if (allSigned) {
      await RvtRepository.update(id, { status: 'ASSINADA' }, client);
    }
  }

  async _generateNextCode() {
    const result = await pool.query(
      "SELECT code FROM audit_quality.rvts ORDER BY id DESC LIMIT 1"
    );
    const lastCode = result.rows[0]?.code;
    const year = new Date().getFullYear();
    const type = 'RVT';
    
    if (!lastCode || !lastCode.includes(year.toString())) {
      return `${type}-${year}-001`;
    }
    
    const parts = lastCode.split('-');
    const sequence = parseInt(parts[2] || '0') + 1;
    return `${type}-${year}-${sequence.toString().padStart(3, '0')}`;
  }
}

export default new RvtService();
