import { Router } from 'express';
import { verifyToken, checkRole } from '../middlewares/auth.js';
import UserService from '../services/UserService.js';

const router = Router();

// tudo aqui exige admin
router.use(verifyToken, checkRole(['admin']));

router.get('/', async (_req, res) => {
  const result = await UserService.listAll();
  res.json(result.data ?? result);
});

router.post('/', async (req, res) => {
  const result = await UserService.create(req.body);
  if (result.error) {
    return res.status(result.status || 400).json({ error: result.message });
  }
  res.status(201).json(result.data);
});

router.put('/:id', async (req, res) => {
  const result = await UserService.update(
    Number(req.params.id),
    req.body
  );
  res.json(result.data ?? result);
});

router.delete('/:id', async (req, res) => {
  const result = await UserService.delete(
    Number(req.params.id),
    req.user.sub // vem do token
  );
  res.json(result.data ?? result);
});

export default router;