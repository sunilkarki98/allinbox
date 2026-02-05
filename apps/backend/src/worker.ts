/**
 * Legacy Worker Orchestrator (DEPRECATED)
 * 
 * @deprecated This file runs all workers in a single process which is NOT recommended
 * for production. Use individual worker entry points instead:
 * 
 * - npm run start:worker:ingestion
 * - npm run start:worker:analysis
 * - npm run start:worker:decay
 * 
 * For development convenience, this file still works but logs a warning.
 */
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

console.warn('⚠️  [DEPRECATED] Running all workers in single process.');
console.warn('⚠️  For production, use separate worker processes:');
console.warn('    npm run start:worker:ingestion');
console.warn('    npm run start:worker:analysis');
console.warn('    npm run start:worker:decay');
console.warn('');

import { ingestionWorker } from './workers/ingestion.worker.js';
import { analysisWorker } from './workers/analysis.worker.js';
import { decayWorker } from './workers/decay.worker.js';
import { webhookWorker } from './workers/webhook.worker.js';
import { scheduleGlobalDecay } from './workers/queue.js';

console.log('[Legacy Orchestrator] Starting all workers...');

// Ensure the workers are running
if (!ingestionWorker.isRunning()) {
    ingestionWorker.run();
}
if (!analysisWorker.isRunning()) {
    analysisWorker.run();
}
if (!decayWorker.isRunning()) {
    decayWorker.run();
}
if (!webhookWorker.isRunning()) {
    webhookWorker.run();
}

// Schedule global decay (idempotent)
scheduleGlobalDecay().catch(err => console.error('Failed to schedule decay job:', err));

console.log('[Legacy Orchestrator] All workers active (Ingestion, Analysis, Decay)');

// Handle graceful shutdown
const shutdown = async () => {
    console.log('[Legacy Orchestrator] Shutting down all workers...');
    await Promise.all([
        ingestionWorker.close(),
        analysisWorker.close(),
        decayWorker.close()
    ]);
    console.log('[Legacy Orchestrator] All workers closed');
    process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

