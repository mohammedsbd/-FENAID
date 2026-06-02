import { Controller, Get } from '@nestjs/common';
import type { HealthCheckResponse } from '@fikir/types';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get('health')
  health(): HealthCheckResponse {
    return this.appService.health();
  }
}
