import { Router, Request, Response, NextFunction } from 'express';
import { requireSuperAdmin } from '../middleware/admin.middleware.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { AdminService } from '../services/admin.service.js';
import { AuditService } from '../services/audit.service.js';
import { updateTenantStatusSchema, updateSystemSettingSchema, extendTrialSchema } from '@allinbox/validators';
import { z } from 'zod';

const router = Router();

// UUID validation schema
const uuidSchema = z.string().uuid('Invalid ID format');

// List all customers
router.get('/customers', authenticateToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const result = await AdminService.getAllTenants(page, limit);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

// Update customer status (Suspend/Activate)
router.patch('/customers/:id/status', authenticateToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        // Validate UUID format
        const idValidation = uuidSchema.safeParse(id);
        if (!idValidation.success) {
            return res.status(400).json({ error: 'Invalid customer ID format' });
        }

        const validation = updateTenantStatusSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({ error: validation.error.issues[0].message });
        }

        const { status } = validation.data;
        const updated = await AdminService.updateTenantStatus(idValidation.data, status);

        if (!updated) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        // Log the action
        await AuditService.logTenantStatusChange(
            res.locals.user.userId,
            idValidation.data,
            status,
            req
        );

        res.json({ customer: updated });
    } catch (error) {
        next(error);
    }
});

// Promote customer to PAID plan
router.post('/customers/:id/promote', authenticateToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        // Validate UUID format
        const idValidation = uuidSchema.safeParse(id);
        if (!idValidation.success) {
            return res.status(400).json({ error: 'Invalid customer ID format' });
        }

        const updated = await AdminService.promoteTenant(idValidation.data);

        if (!updated) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        // Log the action
        await AuditService.logTenantPromotion(
            res.locals.user.userId,
            idValidation.data,
            req
        );

        res.json({ customer: updated, message: 'Customer promoted to PAID plan' });
    } catch (error) {
        next(error);
    }
});

// Extend customer trial
router.post('/customers/:id/extend-trial', authenticateToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        // Validate UUID format
        const idValidation = uuidSchema.safeParse(id);
        if (!idValidation.success) {
            return res.status(400).json({ error: 'Invalid customer ID format' });
        }

        // Use Zod schema for validation (consistent with other endpoints)
        const validation = extendTrialSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: validation.error.issues[0].message });
        }

        const { days } = validation.data;
        const updated = await AdminService.extendTrial(idValidation.data, days);

        if (!updated) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        // Log the action
        await AuditService.logTrialExtension(
            res.locals.user.userId,
            idValidation.data,
            days,
            req
        );

        res.json({ customer: updated, message: `Trial extended by ${days} days` });
    } catch (error) {
        next(error);
    }
});

// LIST System Settings
router.get('/settings', authenticateToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const settings = await AdminService.getSystemSettings();
        res.json({ settings });
    } catch (error) {
        next(error);
    }
});

// UPDATE System Setting
router.put('/settings', authenticateToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const validation = updateSystemSettingSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({ error: validation.error.issues[0].message });
        }

        const { key, value, category } = validation.data;
        const updated = await AdminService.updateSystemSetting(key, value, category);

        // Log the action
        await AuditService.logSettingChange(
            res.locals.user.userId,
            key,
            req
        );

        res.json({ setting: updated });
    } catch (error: any) {
        next(error);
    }
});

export default router;
