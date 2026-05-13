import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.js';
import DashboardService from '../services/DashboardService.js';

const router = Router();

router.use(verifyToken);

/**
 * GET /api/dashboard/stats
 * Retorna KPIs em tempo real (Live Query)
 */
router.get('/stats', async (req, res) => {
  try {
    const { start, end, supplier_id } = req.query;
    
    // Período obrigatório (Default: últimos 30 dias se não informado)
    const filterEnd = end ? new Date(end) : new Date();
    const filterStart = start ? new Date(start) : new Date(new Date().setDate(filterEnd.getDate() - 30));

    const stats = await DashboardService.getStats({
      start: filterStart.toISOString(),
      end: filterEnd.toISOString(),
      supplier_id: supplier_id ? Number(supplier_id) : null
    });

    res.json(stats);
  } catch (err) {
    console.error('[DASHBOARD_ERROR]', err.message);
    res.status(500).json({ error: 'Falha ao processar indicadores em tempo real.' });
  }
});

export default router;
