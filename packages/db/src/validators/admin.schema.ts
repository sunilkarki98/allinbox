import { z } from 'zod';

export const updateTenantStatusSchema = z.object({
    status: z.enum(['ACTIVE', 'SUSPENDED']),
});

export const updateSystemSettingSchema = z.object({
    key: z.string().min(1, 'Key is required'),
    value: z.string().min(1, 'Value is required'),
    category: z.string().optional().default('SYSTEM'),
});

export const extendTrialSchema = z.object({
    days: z.number().int().min(1, 'Days must be at least 1').max(365, 'Cannot extend more than 365 days'),
});
