import { NextFunction, Request, Response } from 'express';
import { addIngestionJob } from '../workers/queue.js';
import { db } from '../db/index.js';
import { connectedAccounts } from '@allinbox/db';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Verify webhook signature from Meta (Instagram/Facebook)
 * Uses HMAC-SHA256 with the app secret
 */
const verifyWebhookSignature = (req: Request): boolean => {
    const signature = req.headers['x-hub-signature-256'] as string;
    const appSecret = process.env.META_APP_SECRET;

    // If no app secret configured, log warning but allow in development
    if (!appSecret) {
        if (process.env.NODE_ENV === 'production') {
            console.error('META_APP_SECRET not configured - rejecting webhook');
            return false;
        }
        console.warn('META_APP_SECRET not configured - skipping signature verification (dev mode)');
        return true;
    }

    if (!signature) {
        console.error('Missing X-Hub-Signature-256 header');
        return false;
    }

    // Calculate expected signature
    const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', appSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    try {
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    } catch (err) {
        console.error('Signature verification failed:', err);
        return false;
    }
};

export const triggerIngestion = async (req: Request, res: Response, next: NextFunction) => {
    const accountId = req.params.accountId as string;
    const tenantId = res.locals.user.userId;

    try {
        const [account] = await db.select().from(connectedAccounts).where(
            and(
                eq(connectedAccounts.id, accountId),
                eq(connectedAccounts.tenantId, tenantId)
            )
        ).limit(1);

        if (!account) {
            res.status(404).json({ error: 'Account not found or access denied' });
            return;
        }

        await addIngestionJob(accountId);
        res.json({ message: 'Ingestion job queued', accountId });
    } catch (error) {
        next(error);
    }
};

export const verifyWebhook = (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === (process.env.WEBHOOK_VERIFY_TOKEN || 'allinbox_token')) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
};

export const handleWebhook = async (req: Request, res: Response, next: NextFunction) => {
    // SECURITY: Verify webhook signature before processing
    if (!verifyWebhookSignature(req)) {
        console.error('🚨 Webhook signature verification failed - potential attack');
        return res.sendStatus(403);
    }

    console.log('✅ Webhook Signature Verified');
    // console.log('⚡ Webhook Received:', JSON.stringify(req.body, null, 2));

    try {
        // Process Instagram messaging events
        const body = req.body;

        if (body.object === 'instagram') {
            for (const entry of body.entry || []) {
                const instagramUserId = entry.id;

                // Find the connected account for this Instagram user
                const [account] = await db.select()
                    .from(connectedAccounts)
                    .where(eq(connectedAccounts.platformUserId, instagramUserId))
                    .limit(1);

                if (account) {
                    // Queue ingestion job to fetch new messages
                    await addIngestionJob(account.id);
                    console.log(`📥 Ingestion queued for account: ${account.id}`);
                } else {
                    console.warn(`No connected account found for Instagram user: ${instagramUserId}`);
                }
            }
        }

        res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
        next(error);
    }
};
