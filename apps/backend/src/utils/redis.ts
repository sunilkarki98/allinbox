import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = createClient({ url: REDIS_URL });

redis.on('error', (err) => console.error('Redis Client Error', err));

// Initial connection
export const connectRedis = async () => {
    if (!redis.isOpen) {
        await redis.connect();
        console.log('Redis Client Connected');
    }
};
