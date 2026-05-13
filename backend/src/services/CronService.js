import cron from 'node-cron';
import pool from '../config/db.js';
import MailService from './MailService.js';
import PortalService from './PortalService.js';

/**
 * BR-IN15-01 — Reforço e Escalonamento de SLA para Resposta de Fornecedor (8D)
 */
const verificarSLAsFornecedor = async () => {
  console.log('🔍 [BR-IN15-01] Iniciando verificação de SLA do Fornecedor...');

  const client = await pool.connect();
  try {
    // 1. Busca documentos aguardando resposta do fornecedor
    const result = await client.query(`
      SELECT
        d.id,
        d.code,
        d.supplier_id,
        d.sent_to_supplier_at,
        d.last_notification_at,
        s.email AS supplier_email,
        s.contact_name,
        u.email AS manager_email
      FROM audit_quality.documents d
      JOIN audit_quality.suppliers s ON d.supplier_id = s.id
      LEFT JOIN audit_quality.users u ON u.role = 'gestor' AND u.active = true
      WHERE d.status = 'ENVIADO_FORNECEDOR'
        AND d.sent_to_supplier_at IS NOT NULL
    `);

    const now = new Date();

    for (const doc of result.rows) {
      const sentDate = new Date(doc.sent_to_supplier_at);
      const lastNotif = doc.last_notification_at ? new Date(doc.last_notification_at) : sentDate;
      
      const calendarDaysSinceSent = Math.floor((now - sentDate) / (1000 * 60 * 60 * 24));
      const calendarDaysSinceLastNotif = Math.floor((now - lastNotif) / (1000 * 60 * 60 * 24));
      
      const businessDaysSinceSent = getBusinessDaysDiff(sentDate, now);
      const isDelayed = businessDaysSinceSent >= 10;

      let shouldNotify = false;
      let notificationType = '';

      if (isDelayed) {
        // Regra: Notificações diárias após estouro
        shouldNotify = calendarDaysSinceLastNotif >= 1;
        notificationType = 'SLA_BREACH_DAILY';
      } else {
        // Regra: A cada 2 dias corridos
        shouldNotify = calendarDaysSinceLastNotif >= 2;
        notificationType = 'PERIODIC_REMINDER';
      }

      if (shouldNotify) {
        console.log(`🔔 [SLA] Notificando ${doc.code} (Tipo: ${notificationType}). Dias Úteis: ${businessDaysSinceSent}`);
        
        await client.query('BEGIN');
        try {
          // A. Gera Magic Link para o Portal
          const magicLink = await PortalService.createMagicLink({
            document_id: doc.id,
            supplier_id: doc.supplier_id, // Precisaria ter o supplier_id no SELECT
            scope: 'EVIDENCE_SUBMISSION'
          }, client);

          // B. Dispara e-mail via MailService
          await MailService.sendSLANotification({
            type: notificationType,
            documentCode: doc.code,
            supplierEmail: doc.supplier_email,
            managerEmail: doc.manager_email,
            contactName: doc.contact_name,
            businessDays: businessDaysSinceSent,
            magic_link: `${process.env.FRONTEND_URL}/portal/${magicLink.token}`
          });

          // B. Atualiza controle de notificação
          await client.query(
            'UPDATE audit_quality.documents SET last_notification_at = NOW() WHERE id = $1',
            [doc.id]
          );

          // C. Registra em Log de Auditoria (BR-IN15-01)
          await client.query(
            `INSERT INTO audit_quality.audit_logs (document_id, action, detail, user_name)
             VALUES ($1, 'Notificação SLA', $2, 'sistema_cron')`,
            [doc.id, `Notificação ${notificationType} enviada. Status SLA: ${isDelayed ? 'ATRASADO' : 'EM PRAZO'} (${businessDaysSinceSent} dias úteis)`]
          );

          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          console.error(`❌ Erro ao processar notificação para ${doc.code}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error('❌ Erro no motor de SLA:', err.message);
  } finally {
    client.release();
  }
};

/**
 * Helper: Diferença em dias úteis (Seg-Sex)
 */
const getBusinessDaysDiff = (start, end) => {
  let count = 0;
  let cur = new Date(start);
  while (cur < end) {
    cur.setDate(cur.getDate() + 1);
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
};

const verificarSLAsRvt = async () => {
  console.log('🔍 [RVT-SLA] Iniciando verificação de SLA de Agendamento...');

  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT
        r.id,
        r.code,
        r.supplier_id,
        r.created_at,
        r.last_notification_at,
        s.email AS supplier_email,
        s.name AS supplier_name,
        u.email AS manager_email
      FROM audit_quality.rvts r
      JOIN audit_quality.suppliers s ON r.supplier_id = s.id
      LEFT JOIN audit_quality.users u ON u.role = 'gestor' AND u.active = true
      WHERE r.status = 'PENDENTE'
    `);

    const now = new Date();

    for (const rvt of result.rows) {
      const createdDate = new Date(rvt.created_at);
      const lastNotif = rvt.last_notification_at ? new Date(rvt.last_notification_at) : createdDate;
      
      const calendarDaysSinceLastNotif = Math.floor((now - lastNotif) / (1000 * 60 * 60 * 24));
      const businessDaysSinceCreated = getBusinessDaysDiff(createdDate, now);
      const isDelayed = businessDaysSinceCreated >= 10;

      let shouldNotify = false;
      let notificationType = '';

      if (isDelayed) {
        shouldNotify = calendarDaysSinceLastNotif >= 1;
        notificationType = 'SLA_BREACH_DAILY';
      } else {
        shouldNotify = calendarDaysSinceLastNotif >= 2;
        notificationType = 'PERIODIC_REMINDER';
      }

      if (shouldNotify) {
        console.log(`🔔 [RVT-SLA] Notificando ${rvt.code}. Dias Úteis: ${businessDaysSinceCreated}`);
        
        await client.query('BEGIN');
        try {
          // A. Gera Magic Link para o Portal
          const magicLink = await PortalService.createMagicLink({
            rvt_id: rvt.id,
            supplier_id: rvt.supplier_id, // Precisaria ter o supplier_id no SELECT
            scope: 'RVT_SCHEDULING'
          }, client);

          await MailService.sendSLANotification({
            type: notificationType,
            documentCode: rvt.code,
            supplierEmail: rvt.supplier_email,
            managerEmail: rvt.manager_email,
            contactName: rvt.supplier_name,
            businessDays: businessDaysSinceCreated,
            module: 'RVT',
            magic_link: `${process.env.FRONTEND_URL}/portal/rvt/${magicLink.token}`
          });

          await client.query(
            'UPDATE audit_quality.rvts SET last_notification_at = NOW() WHERE id = $1',
            [rvt.id]
          );

          await client.query(
            `INSERT INTO audit_quality.audit_logs (document_id, rvt_id, action, detail, user_name)
             VALUES (NULL, $1, 'RVT SLA', $2, 'sistema_cron')`,
            [rvt.id, `Notificação SLA RVT (${notificationType}) enviada para ${rvt.code}`]
          );

          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          console.error(`❌ Erro RVT-SLA ${rvt.code}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error('❌ Erro motor RVT-SLA:', err.message);
  } finally {
    client.release();
  }
};

// Todo dia às 08:00
cron.schedule('0 8 * * *', verificarSLAsFornecedor);
cron.schedule('10 8 * * *', verificarSLAsRvt);

export default { verificarSLAsFornecedor, verificarSLAsRvt };
