/**
 * Consolidated Worker Entry Point
 * Runs all background workers in a single process to save resources.
 * 
 * Usage: node dist/workers/all.entry.js
 */
import dotenv from 'dotenv';
dotenv.config();

import { ingestionWorker } from './ingestion.worker.js';
import { analysisWorker } from './analysis.worker.js';
// FROZEN: Decay worker disabled until validated by customer need
// import { decayWorker } from './decay.worker.js';

console.log('[Unified Worker] Starting all workers...');

const startWorkers = async () => {
    try {
        if (!ingestionWorker.isRunning()) {
            await ingestionWorker.run();
            console.log('[Unified Worker] Ingestion Worker started');
        }

        if (!analysisWorker.isRunning()) {
            await analysisWorker.run();
            console.log('[Unified Worker] Analysis Worker started');
        }

        // FROZEN: Decay worker disabled - no customer has requested automated score decay
        // if (!decayWorker.isRunning()) {
        //     await decayWorker.run();
        //     console.log('[Unified Worker] Decay Worker started');
        // }

        console.log('[Unified Worker] All systems active');
    } catch (error) {
        console.error('[Unified Worker] Failed to start workers:', error);
        process.exit(1);
    }
};

startWorkers();

// Graceful shutdown
const shutdown = async (signal: string) => {
    console.log(`[Unified Worker] Received ${signal}, shutting down gracefully...`);

    await Promise.allSettled([
        ingestionWorker.close(),
        analysisWorker.close(),
        // FROZEN: decayWorker.close()
    ]);

    console.log('[Unified Worker] Shutdown complete');
    process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Error handling
process.on('unhandledRejection', (reason, promise) => {
    console.error('[Unified Worker] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('[Unified Worker] Uncaught Exception:', error);
    process.exit(1);
});
