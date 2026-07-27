import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';
export const IDEMPOTENCY_REPLAY_HEADER = 'Idempotent-Replayed';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const isIdempotent = this.reflector.getAllAndOverride<boolean>(
      IDEMPOTENCY_METADATA,
      [context.getHandler(), context.getClass()],
    );

    if (!isIdempotent) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const key = request.headers[IDEMPOTENCY_KEY_HEADER] as string;

    if (!key) {
      return next.handle();
    }

    const existing = await this.prisma.idempotencyRecord.findUnique({
      where: { key },
    });

    if (existing) {
      response.setHeader(IDEMPOTENCY_REPLAY_HEADER, 'true');
      response.status(200);
      return of(existing.response);
    }

    return next.handle().pipe(
      tap(async (data) => {
        await this.prisma.idempotencyRecord.create({
          data: {
            key,
            response: JSON.parse(JSON.stringify(data)),
          },
        });
      }),
    );
  }
}

export const IDEMPOTENCY_METADATA = 'idempotency';
