import { Injectable } from '@nestjs/common';
import type { HealthCheckResponse } from './types/health-check-response.type';

@Injectable()
export class AppService {
  health(): HealthCheckResponse {
    return {
      status: 'ok',
      service: 'backend',
    };
  }
}
