import { Router } from 'express';
import { PlatformWebhooksController } from '../controllers/platform-webhooks.controller.js';

const router = Router();

// Incoming Webhook Verification (GET) and Events (POST)
// Protocol used by Facebook, Instagram, and WhatsApp
router.get('/:platform', PlatformWebhooksController.verify);
router.post('/:platform', PlatformWebhooksController.receive);

export default router;
