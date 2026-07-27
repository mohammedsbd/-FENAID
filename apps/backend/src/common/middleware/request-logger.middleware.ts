import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const { method, originalUrl } = req;

    res.on('finish', () => {
      const duration = Date.now() - start;
      this.logger.log(
        JSON.stringify({
          method,
          url: originalUrl,
          status: res.statusCode,
          duration: `${duration}ms`,
          userAgent: req.headers['user-agent'] || '',
        }),
      );
    });

    next();
  }
}
