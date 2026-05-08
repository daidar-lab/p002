import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.js';
import ReportService from '../services/ReportService.js';
import ReportRepository from '../repositories/ReportRepository.js';

const router = Router();

router.use(verifyToken);

/**
 * Gatilho de Geração do Relatório 8D (Snapshot Normativo)
 */
router.post('/generate/:documentId', async (req, res) => {
  try {
    const result = await ReportService.generate8DReport(
      Number(req.params.documentId),
      req.user.id
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Listagem de relatórios gerados para um documento
 */
router.get('/document/:documentId', async (req, res) => {
  try {
    const reports = await ReportService.listReports(Number(req.params.documentId));
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Download do artefato imutável
 */
router.get('/download/:reportId', async (req, res) => {
  try {
    const report = await ReportRepository.getById(req.params.reportId);
    if (!report) return res.status(404).json({ error: 'Relatório não encontrado' });

    const filePath = ReportService.getReportPath(report.file_name);
    res.download(filePath, report.file_name);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
