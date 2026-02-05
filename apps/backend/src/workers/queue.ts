import { Queue } from 'bullmq';
import { getBullConnection } from '../utils/clients.js';

export const ingestionQueue = new Queue('ingestion-queue', {
    connection: getBullConnection(),
});

export const decayQueue = new Queue('decay-queue', {
    connection: getBullConnection(),
});

export const addIngestionJob = async (accountId: string) => {
    await ingestionQueue.add('sync-account', { accountId }, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
    });
};

export const scheduleGlobalDecay = async () => {
    // Run every day at midnight
    await decayQueue.add('global-decay', {}, {
        repeat: {
            pattern: '0 0 * * *'
        },
        jobId: 'global-decay-job', // Ensure only one exists
        removeOnComplete: true,
        removeOnFail: false,
    });
    console.log('Scheduled global lead decay job (daily at midnight)');
};
