import { Router } from 'express';

import authRoutes from './auth.routes.js';
import usersRoutes from './users.routes.js';
import suppliersRoutes from './suppliers.routes.js';
import documentsRoutes from './documents.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/suppliers', suppliersRoutes);
router.use('/documents', documentsRoutes);

export default router;