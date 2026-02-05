/**
 * Standalone entry point for Analysis Worker
 * Run this as a separate process for failure isolation
 * 
 * Usage: node dist/workers/analysis.entry.js
 */
import dotenv from 'dotenv';
dotenv.config();

import { analysisWorker } from './analysis.worker.js';

console.log('[Analysis Worker] Starting...');

// Start the worker
if (!analysisWorker.isRunning()) {
    analysisWorker.run();
}

console.log('[Analysis Worker] Active and processing jobs');

// Graceful shutdown
const shutdown = async (signal: string) => {
    console.log(`[Analysis Worker] Received ${signal}, shutting down gracefully...`);
    await analysisWorker.close();
    console.log('[Analysis Worker] Shutdown complete');
    process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
    console.error('[Analysis Worker] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('[Analysis Worker] Uncaught Exception:', error);
    process.exit(1);
});
