import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_ROOT = path.join(__dirname, '../../uploads');

const router = Router();

/**
 * Serve arquivo de evidência RHE (upload local).
 * GET /api/files/rhe/:rheId/:fileName
 */
router.get('/rhe/:rheId/:fileName', (req, res) => {
  try {
    const rheId = path.basename(String(req.params.rheId));
    const fileName = path.basename(String(req.params.fileName));
    const abs = path.join(UPLOADS_ROOT, 'rhe', rheId, fileName);
    if (!abs.startsWith(path.join(UPLOADS_ROOT, 'rhe'))) {
      return res.status(400).json({ error: 'Caminho inválido.' });
    }
    if (!fs.existsSync(abs)) return res.status(404).json({ error: 'Arquivo não encontrado.' });
    res.sendFile(abs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
