import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.js';
import path from 'path';
import { fileURLToPath } from 'url';
import ReportService from '../services/ReportService.js';
import ReportRepository from '../repositories/ReportRepository.js';
import S3Service from '../services/S3Service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const router = Router();

router.use(verifyToken);

/**
 * Visualização de Dados 8D (Real-time para UI)
 */
router.get('/data/:documentId', async (req, res) => {
  try {
    const data = await ReportService.get8DData(Number(req.params.documentId));
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Geração Dinâmica de PDF (On-the-fly)
 */
router.get('/pdf/:documentId', async (req, res) => {
  try {
    const documentId = Number(req.params.documentId);
    
    // Configura headers para download de PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=8D_Report_${documentId}.pdf`);

    await ReportService.generate8DStream(documentId, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
