import { Router } from 'express';
import * as IngestionController from '../controllers/ingestion.controller.js';

import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// In a real app, this should be protected by auth
// Webhook Verification (Meta requires GET)
router.get('/webhook', IngestionController.verifyWebhook);
// Webhook Event Receiver (Meta sends POST)
router.post('/webhook', IngestionController.handleWebhook);

// Trigger manually (SECURED: Only for connected accounts owned by the tenant)
router.post('/:accountId', authenticateToken, IngestionController.triggerIngestion);

export default router;
