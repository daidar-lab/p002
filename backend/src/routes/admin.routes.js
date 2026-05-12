import { Router } from 'express';
import { verifyToken, checkRole } from '../middlewares/auth.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

/**
 * PURGE LOCAL STORAGE (BR-S3-01 Compliance)
 * Remove todos os arquivos locais da pasta /uploads/reports
 * Apenas para Administradores
 */
router.post('/purge-local-reports', verifyToken, checkRole(['admin']), async (req, res) => {
  const reportsDir = path.join(__dirname, '../../uploads/reports');

  try {
    if (!fs.existsSync(reportsDir)) {
      return res.json({ message: 'Diretório não encontrado', count: 0 });
    }

    const files = fs.readdirSync(reportsDir);
    let deletedCount = 0;

    for (const file of files) {
      if (file !== '.gitkeep') {
        fs.unlinkSync(path.join(reportsDir, file));
        deletedCount++;
      }
    }

    res.json({
      operation: "STORAGE_PURGE",
      status: "SUCCESS",
      files_removed: deletedCount,
      directory: "/uploads/reports",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: `Erro na purga: ${err.message}` });
  }
});

export default router;
