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
    const list = await RheService.listRhes(req.query);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Criação de novo RHE (INITIAL ou FINAL)
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user.sub ?? req.user.id;
    const rhe = await RheService.createRhe(req.body, userId);
    res.status(201).json(rhe);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Atualiza dados do formulário (identificacao, fornecedor_produto, resultados, conclusao)
 */
router.patch('/:id/content', async (req, res) => {
  try {
    const detail = await RheService.updateRheContent(req.params.id, req.body);
    res.json(detail);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Inclui foto (JSON: url ou file_base64 + filename)
 */
router.post('/:id/photos', async (req, res) => {
  try {
    const detail = await RheService.addRhePhoto(req.params.id, req.body);
    res.status(201).json(detail);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/photos/:photoId', async (req, res) => {
  try {
    await RheService.updateRhePhotoDescription(req.params.photoId, req.body.descricao);
    res.json({ message: 'Descrição atualizada.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/photos/:photoId', async (req, res) => {
  try {
    await RheService.deleteRhePhoto(req.params.photoId);
    res.json({ message: 'Foto excluída.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/params', async (req, res) => {
  try {
    const detail = await RheService.uploadParametrosRecebimento(req.params.id, req.body);
    res.json(detail);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Estado das assinaturas (espelha contrato do RNC)
 */
router.get('/:id/signatures/status', async (req, res) => {
  try {
    const state = await RheService.getRheSignatureState(req.params.id);
    res.json(state);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/signatures/sign', async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.user.sub ?? req.user.id;
    const detail = await RheService.signRheSignature(req.params.id, role, userId, req.user.role);
    res.json(detail);
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
    const userId = req.user.sub ?? req.user.id;
    const rhe = await RheService.executeGate(req.params.id, userId, req.body.decision);
    res.json(rhe);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Detalhe de um RHE específico (inclui checklist, assinaturas e DTO rhe)
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

export default router;
