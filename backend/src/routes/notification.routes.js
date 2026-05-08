import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.js';
import NotificationRepository from '../repositories/NotificationRepository.js';

const router = Router();

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const list = await NotificationRepository.getAll();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const item = await NotificationRepository.save(req.body);
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const item = await NotificationRepository.update(req.params.id, req.body);
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await NotificationRepository.delete(req.params.id);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
