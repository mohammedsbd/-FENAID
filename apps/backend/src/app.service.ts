import { Injectable } from '@nestjs/common';
import type { HealthCheckResponse } from '@fikir/types';

@Injectable()
export class AppService {
  health(): HealthCheckResponse {
    return {
      status: 'ok',
      service: 'backend',
    };
  }
}
