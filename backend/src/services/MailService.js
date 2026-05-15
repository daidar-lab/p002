import nodemailer from 'nodemailer';
import pool from '../config/db.js';
import NotificationRepository from '../repositories/NotificationRepository.js';

// ── Transporter (lazy — criado na primeira chamada) ────────
let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error('Variáveis SMTP_HOST, SMTP_USER e SMTP_PASS são obrigatórias no .env');
  }

  _transporter = nodemailer.createTransport({
    host:   SMTP_HOST,
    port:   Number(SMTP_PORT) || 587,
    secure: false, 
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: {
      ciphers: 'SSLv3', // Algumas libs de integração ainda exigem, mas vamos garantir o STARTTLS
      rejectUnauthorized: false 
    },
    requireTLS: true,
    debug: true, // Habilita debug para vermos o erro exato no terminal se falhar
    logger: true 
  });

  return _transporter;
}

// ── Grava registro na tabela de logs ──────────────────────
async function persistLog({ recipient, subject, body, status, error_msg, document_id, triggered_by }) {
  try {
    await pool.query(
      `INSERT INTO audit_quality.email_logs
         (recipient, subject, body, status, error_msg, document_id, triggered_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        recipient,
        subject,
        body        ?? null,
        status,
        error_msg   ?? null,
        document_id ?? null,
        triggered_by ?? null,
      ]
    );
  } catch (dbErr) {
    // Log de fallback — não lança para não mascarar o erro original de e-mail
    console.error('MailService: falha ao gravar email_log:', dbErr.message);
  }
}

class MailService {
  /**
   * Envia um e-mail e grava o resultado em email_logs.
   *
   * @param {object} opts
   * @param {string}  opts.to           - Destinatário
   * @param {string}  opts.subject      - Assunto
   * @param {string}  opts.text         - Corpo plain-text
   * @param {string} [opts.html]        - Corpo HTML (opcional)
   * @param {number} [opts.document_id] - FK para documents (opcional)
   * @param {string} [opts.triggered_by]- Username ou 'cron'
   *
   * @returns {{ ok: boolean, error?: string }}
   */
  async send({ to, subject, text, html, document_id, triggered_by }) {
    const from = `"SGNC - Cidade Imperial" <${process.env.SMTP_USER}>`;

    try {
      const transporter = getTransporter();

      await transporter.sendMail({ from, to, subject, text, html });

      await persistLog({
        recipient:    to,
        subject,
        body:         text ?? html,
        status:       'ENVIADO',
        document_id,
        triggered_by,
      });

      console.log(`📧 E-mail enviado → ${to} | ${subject}`);
      return { ok: true };

    } catch (err) {
      console.error(`❌ Falha ao enviar e-mail para ${to}:`, err.message);

      await persistLog({
        recipient:    to,
        subject,
        body:         text ?? html,
        status:       'FALHOU',
        error_msg:    err.message,
        document_id,
        triggered_by,
      });

      return { ok: false, error: err.message };
    }
  }

  /**
   * Atalho para o e-mail de lembrete de pendência (usado pelo Cron).
   */
  async sendPendenciaLembrete({ code, supplier_email, contact_name, document_id }) {
    return this.send({
      to:          supplier_email,
      subject:     `Lembrete: Auditoria Pendente — ${code}`,
      text:        `Olá ${contact_name || 'Fornecedor'},\n\nO documento ${code} ainda aguarda sua resposta no sistema Audit Quality.\n\nPor favor, verifique o quanto antes.\n\nAtenciosamente,\nEquipe de Qualidade`,
      document_id,
      triggered_by: 'cron',
    });
  }

  /**
   * Alerta de reincidência para Qualidade e Compras (BR-05)
   */
  async sendRecurrenceAlert({ rnc_code, supplier_name, category, raqs_count }) {
    // 1. Busca destinatários na Matriz de Notificações (Governança Soberana)
    const matrixRecipients = await NotificationRepository.getRecipientsByCategory(category);
    
    // Fallback para o usuário do SMTP caso a matriz esteja vazia
    const recipients = matrixRecipients.length > 0 
      ? matrixRecipients.join(',') 
      : process.env.SMTP_USER;
    
    return this.send({
      to:          recipients,
      subject:     `🚨 ALERTA DE REINCIDÊNCIA: ${supplier_name} — ${rnc_code}`,
      text:        `Atenção Equipe de Gestão,\n\nO motor de decisão BR-05 detectou reincidência crítica para o fornecedor ${supplier_name} na categoria ${category}.\n\nForam encontradas ${raqs_count} RAQs anteriores nos últimos 12 meses. Por este motivo, a criação de uma nova RAQ foi bloqueada e um RNC (${rnc_code}) foi gerado automaticamente para análise de causa raiz.\n\nPor favor, verifique os detalhes no sistema.\n\nAtenciosamente,\nMotor de Decisão SGNC`,
      triggered_by: 'sistema'
    });
  }

  /**
   * Notifica gestores sobre assinaturas pendentes (BR-07)
   */
  async sendSignatureRequest({ code, roles, document_id }) {
    // Import dinâmico para evitar dependência circular se necessário
    const UserRepository = (await import('../repositories/UserRepository.js')).default;
    const managerEmails = await UserRepository.getByRoles(roles);
    
    if (managerEmails.length === 0) return;

    return this.send({
      to:          managerEmails.join(','),
      subject:     `🖊️ ASSINATURA PENDENTE: ${code}`,
      text:        `Atenção Gestor,\n\nO documento ${code} está pronto para revisão técnica e requer sua assinatura digital.\n\nEste documento segue o fluxo de conformidade da Cidade Imperial com SLA monitorado. Por favor, acesse o sistema para revisar e assinar.\n\nAtenciosamente,\nSistema de Gestão de Não Conformidades`,
      document_id,
    });
  }

  /**
   * Notificações de SLA (BR-IN15-01)
   */
  async sendSLANotification({ type, documentCode, supplierEmail, managerEmail, contactName, businessDays, module = 'RNC', magic_link }) {
    let subject = '';
    let text = '';
    let recipients = [supplierEmail];

    const linkText = magic_link ? `\n\nAcesse o link seguro para regularizar:\n${magic_link}` : '';

    if (module === 'RVT') {
      if (type === 'SLA_BREACH_DAILY') {
        subject = `🚨 ATRASO CRÍTICO (SLA): Agendamento de Visita Pendente — ${documentCode}`;
        text = `Prezado ${contactName || 'Fornecedor'},\n\nO prazo de 10 dias úteis para o agendamento da visita técnica ${documentCode} foi ULTRAPASSADO (${businessDays} dias úteis).\n\nSolicitamos que acesse o portal e selecione uma data imediatamente.${linkText}\n\nAtenciosamente,\nGestão de Qualidade`;
        if (managerEmail) recipients.push(managerEmail);
      } else {
        subject = `Lembrete: Prazo de Agendamento de Visita — ${documentCode}`;
        text = `Olá ${contactName || 'Fornecedor'},\n\nEste é um lembrete periódico sobre a necessidade de agendar a visita técnica ${documentCode}.\n\nLembramos que o prazo total é de 10 dias úteis a partir da abertura.${linkText}\n\nAtenciosamente,\nEquipe de Qualidade`;
      }
    } else {
      if (type === 'SLA_BREACH_DAILY') {
        subject = `🚨 ATRASO CRÍTICO (SLA): Resposta 8D Pendente — ${documentCode}`;
        text = `Prezado ${contactName || 'Fornecedor'},\n\nO prazo de 10 dias úteis para a resposta do documento ${documentCode} foi ULTRAPASSADO (${businessDays} dias úteis).\n\nEste atraso impacta a meta-governança da Cidade Imperial. Solicitamos o preenchimento imediato das informações no portal.${linkText}\n\nAtenciosamente,\nGestão de Qualidade`;
        if (managerEmail) recipients.push(managerEmail);
      } else {
        subject = `Lembrete: Prazo de Resposta 8D — ${documentCode}`;
        text = `Olá ${contactName || 'Fornecedor'},\n\nEste é um lembrete periódico sobre a necessidade de preenchimento do plano de ação (8D) para o documento ${documentCode}.\n\nLembramos que o prazo total é de 10 dias úteis.${linkText}\n\nAtenciosamente,\nEquipe de Qualidade`;
      }
    }

    return this.send({
      to:           recipients.join(','),
      subject,
      text,
      triggered_by: 'sistema_cron'
    });
  }

  async sendRvtSchedulingRequest({ rvt_code, supplier_email, window_start, window_end, magic_link }) {
    return this.send({
      to: supplier_email,
      subject: `📅 Agendamento de Visita Técnica: ${rvt_code}`,
      text: `Atenção Fornecedor,\n\nUm novo Registro de Visita Técnica (${rvt_code}) foi aberto.\n\nPor favor, selecione uma data para a visita entre ${new Date(window_start).toLocaleDateString()} e ${new Date(window_end).toLocaleDateString()} através do link abaixo:\n\n${magic_link}\n\nAtenciosamente,\nGestão de Qualidade`,
      triggered_by: 'sistema'
    });
  }

  async sendRvtSignatureRequest({ rvt_code, supplier_email, magic_link }) {
    return this.send({
      to: supplier_email,
      subject: `🖊️ Assinatura Pendente: Visita Técnica ${rvt_code}`,
      text: `Atenção Fornecedor,\n\nA Visita Técnica ${rvt_code} foi finalizada e requer sua assinatura digital como Representante Técnico.\n\nAcesse o link abaixo para revisar o relatório e assinar:\n\n${magic_link}\n\nAtenciosamente,\nGestão de Qualidade`,
      triggered_by: 'sistema'
    });
  }
  async sendRheResult({ rhe_code, supplier_email, supplier_name, decision, phase }) {
    const resultText = decision === 'APPROVE' ? 'APROVADA' : 'REPROVADA';
    const phaseText = phase === 'INITIAL' ? 'Inicial' : 'Final';
    const subject = `Resultado da Homologação (RHE): ${rhe_code} — ${resultText}`;
    
    const text = `Olá ${supplier_name || 'Fornecedor'},\n\nComunicamos que o processo de homologação ${rhe_code} (${phaseText}) foi finalizado com o resultado: ${resultText}.\n\nPor favor, verifique os detalhes no sistema ou entre em contato com o departamento de Qualidade para mais informações.\n\nAtenciosamente,\nGestão de Qualidade - Cidade Imperial`;

    return this.send({
      to: supplier_email,
      subject,
      text,
      triggered_by: 'sistema'
    });
  }
}

export default new MailService();
