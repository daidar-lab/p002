import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.js';
import RheService from '../services/RheService.js';

const router = Router();

router.use(verifyToken);

/**
 * Listagem geral de RHEs
 */
router.get('/', async (req, res) => {
  try {
    const list = await RheService.listRhes();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Detalhe de um RHE específico (inclui checklist)
 */
router.get('/:id', async (req, res) => {
  try {
    const detail = await RheService.getRheDetail(req.params.id);
    if (!detail) return res.status(404).json({ error: 'RHE não encontrado.' });
    res.json(detail);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Criação de novo RHE (INITIAL ou FINAL)
 */
router.post('/', async (req, res) => {
  try {
    const rhe = await RheService.createRhe(req.body, req.user.id);
    res.status(201).json(rhe);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Gravação parcial ou total do checklist
 */
router.post('/:id/checklist', async (req, res) => {
  try {
    await RheService.saveChecklist(req.params.id, req.body.items);
    res.json({ message: 'Checklist atualizado com sucesso.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Execução do Gate de Aprovação/Reprovação
 */
router.post('/:id/gate', async (req, res) => {
  try {
    const rhe = await RheService.executeGate(req.params.id, req.user.id);
    res.json(rhe);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
