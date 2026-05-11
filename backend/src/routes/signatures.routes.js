import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.js';
import SignatureService from '../services/SignatureService.js';

const router = Router();

router.use(verifyToken);

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
    const { role } = req.body;
    // req.user.id é o identificador único do assinante
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
