import { Router } from 'express';
import * as PlatformsController from '../controllers/platforms.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// Public routes (no auth required)
// OAuth status check for frontend to check configuration
router.get('/oauth-status', PlatformsController.checkOAuthStatus);

// OAuth callback - receives code from Meta after redirect
// Auth is handled via state parameter (contains tenantId)
router.get('/callback/:platform', PlatformsController.handleOAuthCallback);

// Protected routes (require authentication)
router.use(authenticateToken);

// List connected accounts
router.get('/', PlatformsController.list);

// Initiate OAuth flow (redirects to Meta)
router.get('/auth/:platform', PlatformsController.initiateOAuth);

// Legacy connect endpoint (deprecated, returns redirect info)
router.post('/connect', PlatformsController.connect);

// Disconnect a platform
router.post('/disconnect', PlatformsController.disconnect);

export default router;
