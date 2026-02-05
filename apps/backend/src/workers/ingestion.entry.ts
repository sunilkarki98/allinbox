/**
 * Standalone entry point for Ingestion Worker
 * Run this as a separate process for failure isolation
 * 
 * Usage: node dist/workers/ingestion.entry.js
 */
import dotenv from 'dotenv';
dotenv.config();

import { ingestionWorker } from './ingestion.worker.js';

console.log('[Ingestion Worker] Starting...');

// Start the worker
if (!ingestionWorker.isRunning()) {
    ingestionWorker.run();
}

console.log('[Ingestion Worker] Active and processing jobs');

// Graceful shutdown
const shutdown = async (signal: string) => {
    console.log(`[Ingestion Worker] Received ${signal}, shutting down gracefully...`);
    await ingestionWorker.close();
    console.log('[Ingestion Worker] Shutdown complete');
    process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
    console.error('[Ingestion Worker] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('[Ingestion Worker] Uncaught Exception:', error);
    process.exit(1);
});
