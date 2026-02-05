import { Router } from 'express';
import * as WebhooksController from '../controllers/webhooks.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.get('/', WebhooksController.listWebhooks);
router.post('/', WebhooksController.createWebhook);
router.delete('/:id', WebhooksController.deleteWebhook);
router.post('/:id/test', WebhooksController.testWebhook);

export default router;
