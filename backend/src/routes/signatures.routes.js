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
    const result = await SignatureService.getSignatureStatus(Number(req.params.documentId));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Realiza a assinatura eletrônica formal
 */
router.post('/:documentId/sign', async (req, res) => {
  try {
    const { role } = req.body;
    // req.user contém os dados do token JWT (id, role, name)
    const result = await SignatureService.registerSignature(
      Number(req.params.documentId),
      req.user,
      role
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
