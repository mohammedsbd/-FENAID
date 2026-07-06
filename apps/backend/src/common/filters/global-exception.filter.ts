import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { I18nService } from '../../i18n/i18n.service';
import { getLocale } from '../../i18n/i18n.context';

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly i18n: I18nService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const locale = getLocale();

    let status: number;
    let message: string | string[];
    let error: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();

      if (typeof exResponse === 'string') {
        message = this.translate(exResponse, locale);
      } else if (typeof exResponse === 'object' && exResponse !== null) {
        const body = exResponse as Record<string, unknown>;
        const raw = (body.message as string | string[]) ?? exception.message;
        message = Array.isArray(raw)
          ? raw.map((m) => this.translate(m, locale))
          : this.translate(raw, locale);
      } else {
        message = this.translate(exception.message, locale);
      }

      error = HttpStatus[status] ?? 'Error';
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = this.i18n.t('error.internal', {}, locale);
      error = 'Internal Server Error';

      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = this.i18n.t('error.internal', {}, locale);
      error = 'Internal Server Error';
    }

    const body: ErrorResponse = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(body);
  }

  private translate(msg: string, locale: string): string {
    if (msg.startsWith('error.')) {
      return this.i18n.t(msg, {}, locale);
    }
    return msg;
  }
}
