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

export default router;