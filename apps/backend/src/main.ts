import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { I18nMiddleware } from './i18n/i18n.middleware';

function simpleCookieParser(req: any, _res: any, next: () => void) {
  req.cookies = {};
  const header = req.headers?.cookie;
  if (header) {
    for (const pair of header.split(';')) {
      const idx = pair.indexOf('=');
      if (idx > 0) {
        const key = pair.slice(0, idx).trim();
        const val = pair.slice(idx + 1).trim();
        try { req.cookies[key] = decodeURIComponent(val); } catch { req.cookies[key] = val; }
      }
    }
  }
  next();
}

const CSRF_SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function csrfProtection(req: any, res: any, next: () => void) {
  if (CSRF_SAFE_METHODS.has(req.method)) return next();
  const origin = req.headers['origin'];
  const referer = req.headers['referer'];
  const allowed = (process.env.CORS_ORIGIN || '').split(',').map((s: string) => s.trim()).filter(Boolean);
  if (allowed.length === 0) return next();
  const matches = (value: string) => allowed.some((a: string) => value.startsWith(a));
  if (origin && matches(origin)) return next();
  if (referer && matches(referer)) return next();
  res.status(403).json({ message: 'CSRF validation failed' });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  const configService = app.get(ConfigService);

  const jwtSecret = configService.get<string>('JWT_SECRET', '');
  if (!jwtSecret || jwtSecret === 'replace-with-a-secure-secret') {
    console.error('CRITICAL: JWT_SECRET must be changed from the default placeholder value');
    process.exit(1);
  }

  const corsOrigins = (configService.get<string>('CORS_ORIGIN', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!corsOrigins?.length) {
    console.error('CRITICAL: CORS_ORIGIN environment variable is not configured');
    process.exit(1);
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const corsMiddleware = require('cors');
  app.use(corsMiddleware({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }));

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'", ...corsOrigins],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  app.use(simpleCookieParser);
  app.use(csrfProtection);

  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));
  app.use(new I18nMiddleware().use);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = configService.get<number>('PORT', 3001);
  await app.listen(port);
}

void bootstrap();
