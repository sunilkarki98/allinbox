import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as AuthController from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// Rate limiting for auth endpoints: 20 attempts per minute per IP
const authLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    message: { error: 'Too many attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/register', authLimiter, AuthController.register);
router.post('/login', authLimiter, AuthController.login);
router.post('/logout', AuthController.logout);

// Google OAuth Routes
router.get('/google', authLimiter, AuthController.initiateGoogleAuth);
router.get('/callback/google', AuthController.handleGoogleCallback);

router.get('/me', authenticateToken, AuthController.me);
router.patch('/profile', authenticateToken, AuthController.updateProfile);
router.post('/onboarding/complete', authenticateToken, AuthController.completeOnboarding);

export default router;

