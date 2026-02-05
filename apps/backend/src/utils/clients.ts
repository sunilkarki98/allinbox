import { createClient } from 'redis';
import { Queue, Worker, Job } from 'bullmq';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

/**
 * Dragonfly (Redis-compatible) Optimized Client Factory
 * Centralizes connection management to prevent resource leaks and optimize throughput.
 */
class DragonflyManager {
    private static instance: DragonflyManager;
    private client: ReturnType<typeof createClient>;
    private bullConnection: { host: string; port: number };

    private constructor() {
        const url = new URL(REDIS_URL);
        this.bullConnection = {
            host: url.hostname,
            port: parseInt(url.port) || 6379
        };

        this.client = createClient({ url: REDIS_URL });
        this.client.on('error', (err) => console.error('[Dragonfly] Client Error:', err));
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
