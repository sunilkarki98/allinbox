import { Router } from 'express';
import * as ApiKeysController from '../controllers/api-keys.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.get('/', ApiKeysController.listApiKeys);
router.post('/', ApiKeysController.createApiKey);
router.delete('/:id', ApiKeysController.deleteApiKey);

export default router;
