import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { config } from '../config';

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const code = isAppError && err.code ? err.code : 'INTERNAL_SERVER_ERROR';
  const details = isAppError ? err.details : undefined;

  // Mask internal error messages for unhandled internal exceptions in production
  let message = err.message;
  if (!isAppError && config.env === 'production') {
    // Only mask low-level technical errors (e.g. database, syntax, undefined property)
    const isTechnical = !message || /database|syntax|undefined|cannot read|ECONNREFUSED|sqlite/i.test(message);
    if (isTechnical) {
      message = 'Une erreur interne est survenue sur le serveur.';
    }
  }

  logger.error(`[Error Handler] ${statusCode} - ${message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
    isOperational: isAppError ? err.isOperational : false,
    code,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code,
      details,
      ...(config.env === 'development' && !isAppError ? { stack: err.stack } : {}),
    },
  });
}
