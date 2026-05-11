import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.js';
import DocumentService from '../services/DocumentService.js';
import DocumentRepository from '../repositories/DocumentRepository.js';

const router = Router();

// Aplica proteção em todas as rotas deste arquivo
router.use(verifyToken);

/* ──────────────────────────────────────────────
 * Listagem e Detalhes
 * ────────────────────────────────────────────── */
router.get('/', async (_req, res) => {
  res.json(await DocumentService.listDashboard());
});

router.get('/:id', async (req, res) => {
  const doc = await DocumentRepository.getById(Number(req.params.id));
  if (!doc) {
    return res.status(404).json({ error: 'Documento não encontrado.' });
  }
  res.json(doc);
});

/* ──────────────────────────────────────────────
 * CRUD
 * ────────────────────────────────────────────── */
router.post('/', async (req, res) => {
  const result = await DocumentService.create(req.body);
  if (result.error) {
    return res.status(result.status || 400).json({ error: result.message });
  }
  res.status(201).json(result.data);
});

router.put('/:id', async (req, res) => {
  const result = await DocumentService.update(
    Number(req.params.id),
    req.body,
    req.user.name
  );
  if (result.error) {
    return res.status(result.status || 400).json({ error: result.message });
  }
  res.json(result.data);
});

router.delete('/:id', async (req, res) => {
  const result = await DocumentService.delete(Number(req.params.id));
  res.json(result.data ?? result);
});

/* ──────────────────────────────────────────────
 * Status e Timeline
 * ────────────────────────────────────────────── */
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Status é obrigatório.' });
  }

  // ✅ EXTRAINDO O NOME DO USUÁRIO DO TOKEN (req.user.name)
  const result = await DocumentService.changeStatus(
    Number(req.params.id),
    status,
    req.user.name 
  );

  if (result.error) {
    return res.status(result.status || 500).json({ error: result.message });
  }
  res.json(result.data);
});

import DispositionService from '../services/DispositionService.js';

router.post('/:id/disposition', async (req, res) => {
  try {
    const result = await DispositionService.setDisposition(
      Number(req.params.id),
      {
        ...req.body,
        userId: req.user.name,
        role: req.user.role || 'QUALITY_ANALYST'
      }
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:id/disposition', async (req, res) => {
  try {
    const data = await DispositionService.getDisposition(Number(req.params.id));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/timeline', async (req, res) => {
  const result = await DocumentService.getTimeline(Number(req.params.id));
  // Retorna apenas a data (o array de eventos) para o frontend
  res.json(result.data ?? result);
});

export default router;