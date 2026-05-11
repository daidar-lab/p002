import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.js';
import SnapshotService from '../services/SnapshotService.js';

const router = Router();

router.use(verifyToken);

/**
 * Retorna o snapshot auditado mais recente (Fonte para o Dashboard)
 */
router.get('/latest', async (req, res) => {
  try {
    const snapshot = await SnapshotService.getLatestPublished();
    if (!snapshot) {
      return res.status(404).json({ error: 'Nenhum snapshot auditado disponível.' });
    }
    res.json(snapshot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Gera um rascunho de snapshot para um período
 */
router.post('/generate', async (req, res) => {
  try {
    const { start, end } = req.body;
    if (!start || !end) throw new Error('Período (start, end) é obrigatório.');
    
    const snapshot = await SnapshotService.generateSnapshot(start, end);
    res.status(201).json(snapshot);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Audita e Publica um snapshot (Imutabilidade ativada após este passo)
 */
router.post('/:id/publish', async (req, res) => {
  try {
    const result = await SnapshotService.publishSnapshot(req.params.id, req.user.name);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
