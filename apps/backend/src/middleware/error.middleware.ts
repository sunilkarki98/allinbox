import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export interface AppError extends Error {
    statusCode?: number;
}

export const errorHandler = (
    err: AppError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    // Log the error with Request ID for tracing
    logger.error(`${req.method} ${req.path}`, {
        reqId: (req as any).id,
        error: message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });

    res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};
