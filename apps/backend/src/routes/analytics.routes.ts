import { Router } from 'express';
import { getOverview } from '../controllers/analytics.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// All analytics routes require authentication
router.use(authenticateToken);

router.get('/overview', getOverview);

export default router;
