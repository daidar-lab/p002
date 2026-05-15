import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.js';
import SignatureService from '../services/SignatureService.js';

const router = Router();

router.use(verifyToken);

/**
 * Lista assinaturas pendentes para o usuário logado
 */
router.get('/pending', async (req, res) => {
  try {
    const result = await SignatureService.getPendingByUser(req.user.id, req.user.role);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/pending/rhe', async (req, res) => {
  try {
    const RheService = (await import('../services/RheService.js')).default;
    const result = await RheService.getPendingByUser(req.user.id, req.user.role);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Consulta o status das assinaturas de um documento
 */
router.get('/:documentId/status', async (req, res) => {
  try {
    const result = await SignatureService.getHardenedState(Number(req.params.documentId));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:documentId/sign', async (req, res) => {
  try {
    const { role, type } = req.body; // 'RNC' ou 'RHE'
    
    if (type === 'RHE') {
      const RheService = (await import('../services/RheService.js')).default;
      const result = await RheService.signRheSignature(
        req.params.documentId, // No RHE o ID é UUID (string)
        role,
        req.user.id,
        req.user.role
      );
      return res.json(result);
    }

    const result = await SignatureService.sign(
      Number(req.params.documentId),
      role,
      req.user.id
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
