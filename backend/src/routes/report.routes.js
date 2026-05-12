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

    // Lógica Híbrida: Suporte a arquivos Legados (Local) e Novos (S3)
    if (report.file_name.startsWith('rnc/')) {
      const secureUrl = await S3Service.getPresignedUrl(report.file_name);
      
      // Fallback para Mock Mode
      if (secureUrl.startsWith('MOCK_LOCAL_URL:')) {
        const key = secureUrl.replace('MOCK_LOCAL_URL:', '');
        const mockPath = path.join(__dirname, '../../uploads/mock_s3', key.replace(/\//g, '_'));
        return res.download(mockPath, `8D_MOCK_${key.split('/').pop()}`);
      }

      return res.redirect(secureUrl);
    }

    // Caso contrário, tenta baixar local (fallback para registros antigos)
    const filePath = ReportService.getReportPath(report.file_name);
    res.download(filePath, report.file_name);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
