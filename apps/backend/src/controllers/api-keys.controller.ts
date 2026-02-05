import { Request, Response } from 'express';
import { db } from '../db/index.js';
import { apiKeys } from '@allinbox/db';
import { createApiKeySchema } from '@allinbox/validators';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { z } from 'zod';

// Generate a cryptographically secure API key
const generateApiKey = (): { raw: string; hash: string; preview: string } => {
    const raw = `sk_live_${crypto.randomBytes(24).toString('hex')}`;
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const preview = `${raw.slice(0, 8)}...${raw.slice(-4)}`;
    return { raw, hash, preview };
};

// GET /api/keys - List all API keys for current tenant
export const listApiKeys = async (req: Request, res: Response) => {
    try {
        const tenantId = res.locals.user.userId;

        const keys = await db.select({
            id: apiKeys.id,
            name: apiKeys.name,
            keyPreview: apiKeys.keyPreview,
            scopes: apiKeys.scopes,
            lastUsedAt: apiKeys.lastUsedAt,
            createdAt: apiKeys.createdAt,
        }).from(apiKeys).where(eq(apiKeys.tenantId, tenantId));

        res.json(keys);
    } catch (error) {
        console.error('List API keys error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// POST /api/keys - Create a new API key
export const createApiKey = async (req: Request, res: Response) => {
    try {
        const tenantId = res.locals.user.userId;
        const data = createApiKeySchema.parse(req.body);

        const { raw, hash, preview } = generateApiKey();

        const [newKey] = await db.insert(apiKeys).values({
            tenantId,
            name: data.name.trim(),
            keyHash: hash,
            keyPreview: preview,
            scopes: data.scopes,
        }).returning({
            id: apiKeys.id,
            name: apiKeys.name,
            keyPreview: apiKeys.keyPreview,
            scopes: apiKeys.scopes,
            createdAt: apiKeys.createdAt,
        });

        // Return the raw key only once - user must save it
        res.status(201).json({
            ...newKey,
            key: raw, // Only returned on creation
        });
    } catch (error) {
        console.error('Create API key error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// DELETE /api/keys/:id - Revoke an API key
export const deleteApiKey = async (req: Request, res: Response) => {
    try {
        const tenantId = res.locals.user.userId;
        const id = req.params.id as string;

        const result = await db.delete(apiKeys)
            .where(eq(apiKeys.id, id))
            .returning({ id: apiKeys.id });

        if (result.length === 0) {
            return res.status(404).json({ error: 'API key not found' });
        }

        res.json({ message: 'API key revoked' });
    } catch (error) {
        console.error('Delete API key error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
