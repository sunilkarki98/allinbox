/**
 * Standalone entry point for Decay Worker
 * Run this as a separate process for failure isolation
 * 
 * Usage: node dist/workers/decay.entry.js
 */
import dotenv from 'dotenv';
dotenv.config();

import { decayWorker } from './decay.worker.js';
import { scheduleGlobalDecay } from './queue.js';

console.log('[Decay Worker] Starting...');

// Start the worker
if (!decayWorker.isRunning()) {
    decayWorker.run();
}

// Schedule the decay job (idempotent - will not duplicate)
scheduleGlobalDecay()
    .then(() => console.log('[Decay Worker] Scheduled global decay job'))
    .catch(err => console.error('[Decay Worker] Failed to schedule decay job:', err));

console.log('[Decay Worker] Active and processing jobs');

// Graceful shutdown
const shutdown = async (signal: string) => {
    console.log(`[Decay Worker] Received ${signal}, shutting down gracefully...`);
    await decayWorker.close();
    console.log('[Decay Worker] Shutdown complete');
    process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
    console.error('[Decay Worker] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('[Decay Worker] Uncaught Exception:', error);
    process.exit(1);
});
