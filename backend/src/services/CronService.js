import cron from 'node-cron';
import pool from '../config/db.js';
import transporter from '../config/mailer.js';

// Função que encapsula a lógica de verificação
const verificarPendencias = async () => {
  console.log('🔍 Cron: Verificando pendências de fornecedores...');
  
  try {
    const query = `
      SELECT 
        d.id,
        d.code, 
        s.email AS supplier_email, 
        s.contact_name 
      FROM audit_quality.documents d
      JOIN audit_quality.suppliers s ON d.supplier_id = s.id
      WHERE d.status = 'ENVIADO_FORNECEDOR';
    `;

    const result = await pool.query(query);

    if (result.rows.length === 0) {
      console.log('✅ Cron: Nenhuma pendência encontrada.');
      return;
    }

    for (const doc of result.rows) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: doc.supplier_email,
          subject: `Lembrete: Auditoria Pendente - ${doc.code}`,
          text: `Olá ${doc.contact_name || 'Fornecedor'},\n\nO documento ${doc.code} ainda aguarda sua resposta no sistema de Audit Quality.\n\nPor favor, verifique o quanto antes.`,
        });
        
        console.log(`📧 E-mail enviado com sucesso para: ${doc.supplier_email}`);
      } catch (mailError) {
        console.error(`❌ Erro ao enviar e-mail para ${doc.supplier_email}:`, mailError.message);
      }
    }
  } catch (dbError) {
    console.error('❌ Erro de banco de dados no Cron:', dbError.message);
  }
};

// Agenda para rodar todo dia às 08:00
cron.schedule('0 8 * * *', verificarPendencias);

export default { verificarPendencias };