import { Controller, Get, HttpCode } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @HttpCode(200)
  async check() {
    let db: 'ok' | 'error' = 'ok';
    let dbLatency = 0;
    try {
      const before = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - before;
    } catch {
      db = 'error';
    }

    const mem = process.memoryUsage();

    return {
      status: db === 'ok' ? 'healthy' : 'degraded',
      version: process.env.npm_package_version || '0.1.0',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      database: db,
      dbLatencyMs: dbLatency,
      memory: {
        rss: Math.round(mem.rss / 1024 / 1024) + 'MB',
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + 'MB',
      },
      timestamp: new Date().toISOString(),
    };
  }
}
