import nodemailer from 'nodemailer';
import pool from '../config/db.js';

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
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
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
    const from = process.env.SMTP_USER;

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
    // Em um cenário real, os e-mails de Qualidade e Compras viriam do .env ou config
    const recipients = process.env.NOTIFICATION_EMAILS || process.env.SMTP_USER;
    
    return this.send({
      to:          recipients,
      subject:     `🚨 ALERTA DE REINCIDÊNCIA: ${supplier_name} — ${rnc_code}`,
      text:        `Atenção Equipe de Qualidade e Compras,\n\nO motor de decisão BR-05 detectou reincidência crítica para o fornecedor ${supplier_name} na categoria ${category}.\n\nForam encontradas ${raqs_count} RAQs anteriores nos últimos 12 meses. Por este motivo, a criação de uma nova RAQ foi bloqueada e um RNC (${rnc_code}) foi gerado automaticamente para análise de causa raiz.\n\nPor favor, verifique os detalhes no sistema.\n\nAtenciosamente,\nMotor de Decisão SGNC`,
      triggered_by: 'sistema'
    });
  }
}

export default new MailService();
