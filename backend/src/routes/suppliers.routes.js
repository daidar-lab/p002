import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.js';
import SupplierService from '../services/SupplierService.js';

const router = Router();

router.use(verifyToken);

router.get('/', async (req, res) => {
  const result = await SupplierService.listAll(req.query);
  res.json(result);
});

router.post('/', async (req, res) => {
  const result = await SupplierService.create(req.body);
  if (result.error) {
    return res.status(result.status || 400).json({ error: result.message });
  }
  res.status(201).json(result.data);
});

router.put('/:id', async (req, res) => {
  const result = await SupplierService.update(
    Number(req.params.id),
    req.body
  );
  res.json(result.data ?? result);
});

router.delete('/:id', async (req, res) => {
  const result = await SupplierService.delete(Number(req.params.id));
  res.json(result.data ?? result);
});

export default router;