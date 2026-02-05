import { z } from 'zod';

export const createApiKeySchema = z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
    scopes: z.array(z.string()).optional().default(['read:inbox', 'write:reply']),
});

export const apiKeyIdSchema = z.object({
    id: z.string().uuid('Invalid API key ID'),
});
