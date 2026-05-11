import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.js';
import AuditService from '../services/AuditService.js';
import AuditRepository from '../repositories/AuditRepository.js';

const router = Router();

router.use(verifyToken);

/**
 * Disparo de Auditoria Sistêmica (Exige Autenticação)
 */
router.post('/run', async (req, res) => {
  try {
    const { type, start, end } = req.body;
    const result = await AuditService.runAudit(type, start, end, req.user.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Disparo simplificado via botão (Snapshot 30 dias)
 */
router.post('/generate', async (req, res) => {
  try {
    const result = await AuditService.generateAutoSnapshots(req.user.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Listagem do histórico de snapshots de auditoria
 */
router.get('/history', async (req, res) => {
  try {
    const history = await AuditService.getHistory();
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Consulta detalhe de um snapshot específico
 */
router.get('/:id', async (req, res) => {
  try {
    const audit = await AuditRepository.getById(req.params.id);
    if (!audit) return res.status(404).json({ error: 'Auditoria não encontrada' });
    res.json(audit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
