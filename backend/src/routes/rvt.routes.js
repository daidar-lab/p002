import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.js';
import RvtService from '../services/RvtService.js';

const router = Router();

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const rvts = await RvtService.list(req.query);
    res.json(rvts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const rvt = await RvtService.getDetail(req.params.id);
    if (!rvt) return res.status(404).json({ error: 'RVT não encontrado' });
    res.json(rvt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const rvt = await RvtService.create({ ...req.body, user_id: req.user.id }, req.user.name);
    res.status(201).json(rvt);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const rvt = await RvtService.update(req.params.id, req.body, req.user.name);
    res.json(rvt);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/finalizar', async (req, res) => {
  try {
    const result = await RvtService.finalize(req.params.id, req.user.name);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/assinar', async (req, res) => {
  try {
    const { role } = req.body;
    const result = await RvtService.signInternal(req.params.id, {
      user_id: req.user.id,
      signer_name: req.user.name,
      role
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
