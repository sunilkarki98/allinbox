import { createClient } from 'redis';
import { Queue, Worker, Job } from 'bullmq';

import { env } from '../config/env.js';

const REDIS_URL = env.REDIS_URL;

/**
 * Dragonfly (Redis-compatible) Optimized Client Factory
 * Centralizes connection management to prevent resource leaks and optimize throughput.
 */
class DragonflyManager {
    private static instance: DragonflyManager;
    private client: ReturnType<typeof createClient>;
    private bullConnection: {
        host: string;
        port: number;
        retryStrategy?: (times: number) => number | void | null;
        maxRetriesPerRequest?: number | null;
    };

    private constructor() {
        const url = new URL(REDIS_URL);
        this.bullConnection = {
            host: url.hostname,
            port: parseInt(url.port) || 6379,
            retryStrategy: (times: number) => Math.min(times * 50, 2000),
            maxRetriesPerRequest: null
        };

        this.client = createClient({
            url: REDIS_URL,
            socket: {
                reconnectStrategy: (retries) => {
                    // Infinite retries with exponential backoff, capped at 5 seconds
                    const delay = Math.min(retries * 100, 5000);
                    if (retries % 10 === 0) {
                        console.log(`[Dragonfly] Reconnecting... Attempt ${retries} (Delay: ${delay}ms)`);
                    }
                    return delay;
                }
            }
        });

        this.client.on('error', (err) => console.error('[Dragonfly] Client Error:', err));
        this.client.on('connect', () => console.log('[Dragonfly] Client Connecting...'));
        this.client.on('ready', () => console.log('[Dragonfly] Client Ready'));
        this.client.on('reconnecting', () => console.log('[Dragonfly] Client Reconnecting...'));
    }

    public static getInstance(): DragonflyManager {
        if (!DragonflyManager.instance) {
            DragonflyManager.instance = new DragonflyManager();
        }
        return DragonflyManager.instance;
    }

    public getClient() {
        return this.client;
    }

    public getBullConnection() {
        return this.bullConnection;
    }

    public async connect() {
        if (!this.client.isOpen) {
            await this.client.connect();
        }
    }

    public async quit() {
        if (this.client.isOpen) {
            await this.client.quit();
        }
    }

    public async ensureConnection() {
        if (!this.client.isOpen) {
            await this.client.connect();
        }
    }
}

export const dragonfly = DragonflyManager.getInstance();
export const getBullConnection = () => dragonfly.getBullConnection();

// Global Clients
export const redisPub = dragonfly.getClient();
export const analysisQueue = new Queue('analysis-queue', {
    connection: getBullConnection(),
    defaultJobOptions: {
        attempts: 5,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
    }
});

export const webhookQueue = new Queue('webhook-queue', {
    connection: getBullConnection(),
    defaultJobOptions: {
        attempts: 5,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
    }
});
