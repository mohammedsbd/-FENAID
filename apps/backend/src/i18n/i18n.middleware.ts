import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { localeStorage } from './i18n.context';

@Injectable()
export class I18nMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const header = req.headers['accept-language'];
    let locale = 'en';

    if (header) {
      const raw = header.split(',')[0]?.split('-')[0]?.toLowerCase();
      if (raw === 'am' || raw === 'om') {
        locale = raw;
      }
    }

    localeStorage.run(locale, next);
  }
}
