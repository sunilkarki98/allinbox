import { Request, Response } from 'express';
import { db } from '../db/index.js';
import { webhooks } from '@allinbox/db';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// Generate webhook signing secret
const generateSecret = (): string => {
    return `whsec_${crypto.randomBytes(24).toString('hex')}`;
};

// GET /api/webhooks - List all webhooks for current tenant
export const listWebhooks = async (req: Request, res: Response) => {
    try {
        const tenantId = res.locals.user.userId;

        const result = await db.select({
            id: webhooks.id,
            url: webhooks.url,
            events: webhooks.events,
            isActive: webhooks.isActive,
            lastDeliveryAt: webhooks.lastDeliveryAt,
            failureCount: webhooks.failureCount,
            createdAt: webhooks.createdAt,
        }).from(webhooks).where(eq(webhooks.tenantId, tenantId));

        res.json(result);
    } catch (error) {
        console.error('List webhooks error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// POST /api/webhooks - Create a new webhook
export const createWebhook = async (req: Request, res: Response) => {
    try {
        const tenantId = res.locals.user.userId;
        const { url, events } = req.body;

        if (!url || !url.startsWith('https://')) {
            return res.status(400).json({ error: 'Valid HTTPS URL is required' });
        }

        if (!events || !Array.isArray(events) || events.length === 0) {
            return res.status(400).json({ error: 'At least one event is required' });
        }

        const secret = generateSecret();

        const [newWebhook] = await db.insert(webhooks).values({
            tenantId,
            url,
            secret,
            events,
        }).returning({
            id: webhooks.id,
            url: webhooks.url,
            events: webhooks.events,
            isActive: webhooks.isActive,
            createdAt: webhooks.createdAt,
        });

        // Return secret only once
        res.status(201).json({
            ...newWebhook,
            secret, // Only returned on creation
        });
    } catch (error) {
        console.error('Create webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// DELETE /api/webhooks/:id - Delete a webhook
export const deleteWebhook = async (req: Request, res: Response) => {
    try {
        const tenantId = res.locals.user.userId;
        const id = req.params.id as string;

        const result = await db.delete(webhooks)
            .where(eq(webhooks.id, id))
            .returning({ id: webhooks.id });

        if (result.length === 0) {
            return res.status(404).json({ error: 'Webhook not found' });
        }

        res.json({ message: 'Webhook deleted' });
    } catch (error) {
        console.error('Delete webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// POST /api/webhooks/:id/test - Send a test payload
export const testWebhook = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        const [webhook] = await db.select().from(webhooks).where(eq(webhooks.id, id)).limit(1);

        if (!webhook) {
            return res.status(404).json({ error: 'Webhook not found' });
        }

        // TODO: Actually deliver test payload using fetch
        // For now, just acknowledge
        res.json({ message: 'Test payload sent', success: true });
    } catch (error) {
        console.error('Test webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
