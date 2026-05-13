import { Router } from 'express';

import authRoutes from './auth.routes.js';
import userRoutes from './users.routes.js';
import supplierRoutes from './suppliers.routes.js';
import documentRoutes from './documents.routes.js';
import portalRoutes from './portal.routes.js';
import signatureRoutes from './signatures.routes.js';
import reportRoutes from './report.routes.js';
import auditRoutes from './audit.routes.js';
import notificationRoutes from './notification.routes.js';
import snapshotRoutes from './snapshots.routes.js';
import adminRoutes from './admin.routes.js';
import rheRoutes from './rhe.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import rvtRoutes from './rvt.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/documents', documentRoutes);
router.use('/portal', portalRoutes);
router.use('/signatures', signatureRoutes);
router.use('/reports', reportRoutes);
router.use('/audits', auditRoutes);
router.use('/notifications', notificationRoutes);
router.use('/snapshots', snapshotRoutes);
router.use('/admin', adminRoutes);
router.use('/rhes', rheRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/rvt', rvtRoutes);

export default router;