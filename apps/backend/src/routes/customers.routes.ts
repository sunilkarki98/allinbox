import { Router } from 'express';
import * as CustomersController from '../controllers/customers.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', authenticateToken, CustomersController.getCustomers);
router.get('/lookup', authenticateToken, CustomersController.lookupCustomer);
router.patch('/:id', authenticateToken, CustomersController.updateCustomer);

export default router;
