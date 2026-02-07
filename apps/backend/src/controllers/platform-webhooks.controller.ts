/**
 * Platform Webhooks Controller
 * 
 * Handles incoming webhooks from social media platforms (Instagram, Facebook, WhatsApp).
 * Verifies signatures, parses payloads, and triggers ingestion.
 */

import { Request, Response } from 'express';
import { PlatformService, PlatformType } from '../services/platform.service.js';
import { webhookQueue } from '../utils/clients.js';
import crypto from 'crypto';

const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'allinbox_verify_token';
const APP_SECRET = process.env.FACEBOOK_APP_SECRET || 'app_secret';

export class PlatformWebhooksController {

    /**
     * Handle Webhook Verification (GET)
     * Standard protocol for Facebook/Instagram/WhatsApp
     */
    static async verify(req: Request, res: Response) {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode && token) {
            if (mode === 'subscribe' && token === VERIFY_TOKEN) {
                console.log('✅ Webhook verified');
                res.status(200).send(challenge);
            } else {
                console.error('❌ Webhook verification failed');
                res.sendStatus(403);
            }
        } else {
            res.sendStatus(400);
        }
    }

    /**
     * Handle Incoming Events (POST)
     */
    static async receive(req: Request, res: Response) {
        const platformParam = req.params.platform as string;
        const platform = platformParam.toUpperCase() as PlatformType;

        if (!['INSTAGRAM', 'FACEBOOK', 'WHATSAPP'].includes(platform)) {
            return res.status(400).json({ error: 'Unsupported platform' });
        }

        // Security: Verify Signature (X-Hub-Signature-256)
        // Note: In production, this should be a middleware
        const signature = req.headers['x-hub-signature-256'] as string;
        if (process.env.NODE_ENV === 'production' && !verifySignature(req.body, signature)) {
            console.error('❌ Invalid webhook signature');
            return res.status(401).json({ error: 'Invalid signature' });
        }

        try {
            // Process asynchronously via Queue
            const payload = req.body;
            console.log(`📥 Received ${platform} webhook event. Queuing job...`);

            await webhookQueue.add('process-webhook', {
                platform,
                payload
            }, {
                attempts: 5,
                backoff: {
                    type: 'exponential',
                    delay: 2000
                },
                removeOnComplete: true,
                removeOnFail: false
            });

            console.log(`✅ Queued webhook for ${platform}`);

            // Acknowledge receipt only AFTER successful queueing
            res.status(200).send('EVENT_RECEIVED');

        } catch (error) {
            console.error('❌ Webhook queuing error:', error);
            // If Redis is down, return 500 so Meta retries later
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}

/**
 * Helper: Verify X-Hub-Signature-256
 */
function verifySignature(payload: any, signature: string): boolean {
    if (!signature) return false;

    const elements = signature.split('=');
    const signatureHash = elements[1];
    const expectedHash = crypto
        .createHmac('sha256', APP_SECRET)
        .update(JSON.stringify(payload))
        .digest('hex');

    return signatureHash === expectedHash;
}

/**
 * Helper: Extract Receiver ID (Page ID, WA Phone ID)
 */
function getReceiverIdFromPayload(platform: PlatformType, payload: any): string | null {
    try {
        if (platform === 'INSTAGRAM' || platform === 'FACEBOOK') {
            // Standard Graph API Webhook structure: entry[{ id: "PAGE_ID", ... }]
            if (payload.entry && payload.entry[0]) {
                return payload.entry[0].id;
            }
        }

        if (platform === 'WHATSAPP') {
            // entry[{ changes: [{ value: { metadata: { phone_number_id: "ID" } } }] }]
            if (payload.entry && payload.entry[0] &&
                payload.entry[0].changes && payload.entry[0].changes[0] &&
                payload.entry[0].changes[0].value &&
                payload.entry[0].changes[0].value.metadata) {
                return payload.entry[0].changes[0].value.metadata.phone_number_id;
            }
        }
    } catch (e) {
        return null;
    }
    return null;
}
