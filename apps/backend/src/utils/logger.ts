/**
 * Enterprise-Grade Structured Logger
 * Built on Winston for high-performance, asynchronous logging.
 */
import winston from 'winston';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const { combine, timestamp, json, colorize, printf, errors } = winston.format;

// Custom format for local development
const devFormat = printf(({ level, message, timestamp, reqId, ...metadata }) => {
    let log = `${timestamp} [${level}]`;
    if (reqId) log += ` [${reqId}]`;
    log += `: ${message}`;

    // Print metadata if exists (excluding internal fields)
    if (Object.keys(metadata).length > 0) {
        log += ` ${JSON.stringify(metadata)}`;
    }
    return log;
});

const isProd = process.env.NODE_ENV === 'production';

// Create Winston Logger Instance
export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    // Default format: JSON with Timestamp and Error Stack
    format: combine(
        errors({ stack: true }), // Capture stack trace
        timestamp(),
        json()
    ),
    defaultMeta: { service: 'unified-inbox-backend' },
    transports: [
        new winston.transports.Console({
            format: isProd
                ? json() // Production: JSON line
                : combine(colorize(), timestamp(), devFormat) // Dev: Readable
        }),
        // Add File transport if needed later
        // new winston.transports.File({ filename: 'error.log', level: 'error' }),
    ],
});

/**
 * Middleware: Attach Correlation ID
 * Threads a unique ID through the request lifecycle for distributed tracing.
 */
export const correlationMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const reqId = (req.headers['x-request-id'] as string) || crypto.randomUUID();

    // Set on response so client sees it
    res.setHeader('x-request-id', reqId);

    // Attach to request object for use in controllers
    (req as any).id = reqId;

    // Create a child logger for this request context
    // This allows `req.log.info()` to automatically include reqId
    (req as any).log = logger.child({ reqId });

    next();
};

/**
 * Type extension for Express Request
 */
declare global {
    namespace Express {
        interface Request {
            id: string;
            log: winston.Logger;
        }
    }
}
