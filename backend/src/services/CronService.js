import cron from 'node-cron';
import pool from '../config/db.js';
import transporter from '../config/mailer.js';

const verificarPendencias = async () => {
  console.log('🔍 Cron: Verificando pendências...');

  try {
    const result = await pool.query(`
      SELECT
        d.id,
        d.code,
        s.email        AS supplier_email,
        s.contact_name AS contact_name
      FROM audit_quality.documents d
      JOIN audit_quality.suppliers s ON d.supplier_id = s.id
      WHERE d.status = 'ENVIADO_FORNECEDOR'
    `);

    if (result.rows.length === 0) {
      console.log('✅ Cron: Nenhuma pendência encontrada.');
      return;
    }

    for (const doc of result.rows) {
      try {
        await transporter.sendMail({
          from:    process.env.SMTP_USER,
          to:      doc.supplier_email,
          subject: `Lembrete: Auditoria Pendente — ${doc.code}`,
          text:    `Olá ${doc.contact_name || 'Fornecedor'},\n\nO documento ${doc.code} ainda aguarda sua resposta no sistema Audit Quality.\n\nPor favor, verifique o quanto antes.\n\nAtenciosamente,\nEquipe de Qualidade`,
        });
        console.log(`📧 E-mail enviado para: ${doc.supplier_email} (${doc.code})`);
      } catch (mailErr) {
        console.error(`❌ Falha ao enviar e-mail para ${doc.supplier_email}:`, mailErr.message);
      }
    }
  } catch (dbErr) {
    console.error('❌ Erro no Cron:', dbErr.message);
  }
};

// Todo dia às 08:00
cron.schedule('0 8 * * *', verificarPendencias);

export default { verificarPendencias };
