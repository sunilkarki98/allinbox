import { Router } from 'express';
import * as InteractionsController from '../controllers/interactions.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', authenticateToken, InteractionsController.getInteractions);
router.get('/user/:username', authenticateToken, InteractionsController.getInteractionsByLead);

export default router;
