import { Router } from 'express';
import PortalService from '../services/PortalService.js';

const router = Router();

/**
 * ROTA PÚBLICA (Protegida pela Soberania do Token no Banco)
 * Acesso aos dados do RNC pelo fornecedor
 */
router.get('/access/:token', async (req, res) => {
  try {
    const data = await PortalService.getPortalData(req.params.token);
    res.json(data);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

/**
 * ROTA PÚBLICA
 * Submissão de evidência (Uso Único)
 */
router.post('/evidence/:token', async (req, res) => {
  try {
    const result = await PortalService.submitEvidence(req.params.token, req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * ROTA PÚBLICA
 * Seleção de data de RVT
 */
router.post('/rvt/:token/select-date', async (req, res) => {
  try {
    const { selectedDate } = req.body;
    const result = await PortalService.selectRvtDate(req.params.token, selectedDate);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * ROTA PÚBLICA
 * Assinatura de RVT pelo fornecedor
 */
router.post('/rvt/:token/sign', async (req, res) => {
  try {
    const { signerName } = req.body;
    const result = await PortalService.signRvt(req.params.token, signerName);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * ROTA PRIVADA (Exige Token de Admin/Usuário logado)
 * Geração do link para o fornecedor
 */
import { verifyToken } from '../middlewares/auth.js';
router.post('/generate-link', verifyToken, async (req, res) => {
  try {
    const { documentId } = req.body;
    const result = await PortalService.generateLink(documentId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
