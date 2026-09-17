import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const { method, originalUrl, ip } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    logger.log(logLevel, `${method} ${originalUrl} ${statusCode} - ${duration}ms`, {
      ip,
      method,
      url: originalUrl,
      statusCode,
      durationMs: duration,
    });
  });

  next();
}
