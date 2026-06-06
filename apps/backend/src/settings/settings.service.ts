import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSystemSettingsDto } from './dto/update-system-settings.dto';

type CalendarSystem = 'GREGORIAN' | 'ETHIOPIAN';

type CalendarSettingRow = {
  key: string;
  value: {
    calendarSystem?: CalendarSystem;
  };
  updatedAt: Date;
};

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSystemSettings() {
    const calendar = await this.getCalendarSetting();

    return {
      calendarSystem: calendar.value.calendarSystem ?? 'GREGORIAN',
      updatedAt: calendar.updatedAt,
    };
  }

  async updateSystemSettings(
    staffId: string,
    dto: UpdateSystemSettingsDto,
    meta: { ipAddress?: string; userAgent?: string } = {},
  ) {
    const value = { calendarSystem: dto.calendarSystem };
    const jsonValue = JSON.stringify(value);

    await this.prisma.$executeRaw`
      INSERT INTO "SystemSetting" ("key", "value", "updatedById", "updatedAt")
      VALUES ('calendar', ${jsonValue}::jsonb, ${staffId}, NOW())
      ON CONFLICT ("key") DO UPDATE
      SET "value" = EXCLUDED."value",
          "updatedById" = EXCLUDED."updatedById",
          "updatedAt" = NOW()
    `;

    await this.prisma.auditLog.create({
      data: {
        staffId,
        action: 'UPDATE_SYSTEM_SETTINGS',
        entity: 'SystemSetting',
        entityId: 'calendar',
        changes: value as Prisma.InputJsonValue,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });

    return this.getSystemSettings();
  }

  private async getCalendarSetting() {
    const rows = await this.prisma.$queryRaw<CalendarSettingRow[]>`
      SELECT "key", "value", "updatedAt"
      FROM "SystemSetting"
      WHERE "key" = 'calendar'
      LIMIT 1
    `;

    if (rows[0]) {
      return rows[0];
    }

    await this.prisma.$executeRaw`
      INSERT INTO "SystemSetting" ("key", "value")
      VALUES ('calendar', '{"calendarSystem":"GREGORIAN"}'::jsonb)
      ON CONFLICT ("key") DO NOTHING
    `;

    return {
      key: 'calendar',
      value: { calendarSystem: 'GREGORIAN' as const },
      updatedAt: new Date(),
    };
  }
}
