import { Router } from 'express';

import authRoutes from './auth.routes.js';
import userRoutes from './users.routes.js';
import supplierRoutes from './suppliers.routes.js';
import documentRoutes from './documents.routes.js';
import portalRoutes from './portal.routes.js';
import signatureRoutes from './signatures.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/documents', documentRoutes);
router.use('/portal', portalRoutes);
router.use('/signatures', signatureRoutes);

export default router;