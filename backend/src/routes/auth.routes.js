import { Router } from 'express';
import UserService from '../services/UserService.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      error: 'Username e senha são obrigatórios.',
    });
  }

  const result = await UserService.login(username, password);

  if (result.error) {
    return res.status(result.status || 401).json({ error: result.message });
  }

  res.json(result.data);
});

export default router;