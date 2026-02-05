import { Router } from 'express';
import * as PostsController from '../controllers/posts.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/summary', authenticateToken, PostsController.getPostsSummary);
router.get('/:id/leads', authenticateToken, PostsController.getPostLeads);

export default router;
