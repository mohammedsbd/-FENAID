import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';
import type { HealthCheckResponse } from './types/health-check-response.type';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get('health')
  health(): HealthCheckResponse {
    return this.appService.health();
  }
}
