/**
 * @allinbox/validators
 * 
 * Zod validation schemas for API request validation.
 * Used by both backend and frontend.
 */
import { z } from 'zod';

// ============================================================================
// AUTH VALIDATORS
// ============================================================================

export const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

// ============================================================================
// ADMIN VALIDATORS
// ============================================================================

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

// ============================================================================
// API KEYS VALIDATORS
// ============================================================================

export const createApiKeySchema = z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
    scopes: z.array(z.string()).optional().default(['read:inbox', 'write:reply']),
});

export const apiKeyIdSchema = z.object({
    id: z.string().uuid('Invalid API key ID'),
});

// ============================================================================
// COMMON VALIDATORS
// ============================================================================

export const uuidSchema = z.string().uuid('Invalid ID format');

export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
});

// ============================================================================
// ONBOARDING VALIDATORS
// ============================================================================

export const onboardingSchema = z.object({
    businessName: z.string().min(1, 'Business name is required'),
    businessType: z.enum(['PRODUCT', 'SERVICE']),
});
