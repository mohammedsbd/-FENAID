import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as bcrypt from 'bcrypt';
import { randomBytes, randomUUID } from 'crypto';
import { I18nService } from '../i18n/i18n.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtPayload } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async login(
    loginDto: LoginDto,
    metadata: { ipAddress?: string; userAgent?: string } = {},
  ) {
    const email = loginDto.email.toLowerCase();
    const staff = await this.prisma.staff.findUnique({
      where: { email },
    });

    if (!staff || staff.deletedAt || !staff.isActive) {
      await this.logLoginAttempt({
        staffId: null,
        entityId: 'unknown',
        success: false,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      });
      throw new UnauthorizedException('error.auth.invalidCredentials');
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      staff.passwordHash,
    );

    await this.logLoginAttempt({
      staffId: staff.id,
      entityId: staff.id,
      success: passwordMatches && staff.isActive && !staff.deletedAt,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });

    if (!passwordMatches || !staff.isActive || staff.deletedAt) {
      throw new UnauthorizedException('error.auth.invalidCredentials');
    }

    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + parseJwtDuration(
      this.configService.get<string>('JWT_EXPIRES_IN', '1d'),
    ));

    await this.prisma.session.create({
      data: {
        staffId: staff.id,
        tokenId: sessionId,
        userAgent: metadata.userAgent,
        ipAddress: metadata.ipAddress,
        expiresAt,
      },
    });

    await this.prisma.staff.update({
      where: { id: staff.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    const payload: JwtPayload = {
      staffId: staff.id,
      email: staff.email,
      role: staff.role,
      sessionId,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      mustChangePassword: staff.mustChangePassword,
      user: {
        id: staff.id,
        fullName: staff.fullName,
        email: staff.email,
        role: staff.role,
        phone: staff.phone,
        photoUrl: staff.photoUrl,
        mustChangePassword: staff.mustChangePassword,
      },
    };
  }

  async changePassword(staffId: string, dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('error.auth.passwordMismatch');
    }

    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!staff?.isActive) {
      throw new UnauthorizedException('error.auth.staffInactive');
    }

    const currentPasswordMatches = await bcrypt.compare(
      dto.currentPassword,
      staff.passwordHash,
    );

    if (!currentPasswordMatches) {
      throw new UnauthorizedException('error.auth.currentPasswordIncorrect');
    }

    await this.ensurePasswordNotReused(staff.id, dto.newPassword, staff.passwordHash);
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    const updatedStaff = await this.prisma.$transaction(async (tx) => {
      await tx.passwordHistory.create({
        data: {
          staffId: staff.id,
          passwordHash: staff.passwordHash,
        },
      });

      await tx.session.updateMany({
        where: { staffId: staff.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          staffId: staff.id,
          action: 'PASSWORD_CHANGED',
          entity: 'Staff',
          entityId: staff.id,
          changes: {},
        },
      });

      return tx.staff.update({
        where: { id: staffId },
        data: {
          passwordHash,
          mustChangePassword: false,
          passwordUpdatedAt: new Date(),
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          mustChangePassword: true,
        },
      });
    });

    return {
      user: updatedStaff,
      message: this.i18n.t('error.success.changePassword'),
    };
  }

  async me(staffId: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        phone: true,
        photoUrl: true,
        isActive: true,
        mustChangePassword: true,
        notificationPreferences: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!staff?.isActive) {
      throw new UnauthorizedException('error.auth.staffInactive');
    }

    return staff;
  }

  async logout(sessionId: string) {
    await this.prisma.session.update({
      where: { tokenId: sessionId },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const staff = await this.prisma.staff.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!staff || staff.deletedAt || !staff.isActive) {
      return { message: this.i18n.t('error.success.forgotPassword') };
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: { staffId: staff.id, token, expiresAt },
    });

    await this.prisma.auditLog.create({
      data: {
        staffId: staff.id,
        action: 'PASSWORD_RESET_REQUESTED',
        entity: 'Staff',
        entityId: staff.id,
        changes: { email: staff.email },
      },
    });

    const resetUrl = `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${token}`;

    await this.mailService.send({
      to: staff.email,
      subject: 'Fikir App - Password Reset',
      text: `Reset your password here: ${resetUrl}\n\nThis link expires in 1 hour.`,
      html: `<p>Reset your password <a href="${resetUrl}">here</a>.</p><p>This link expires in 1 hour.</p>`,
    });

    return { message: this.i18n.t('error.success.forgotPassword') };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('error.auth.passwordMismatch');
    }

    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token: dto.token },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('error.auth.invalidResetToken');
    }

    const staff = await this.prisma.staff.findUnique({
      where: { id: record.staffId },
      select: { passwordHash: true },
    });
    if (!staff) throw new NotFoundException('error.account.notFound');

    await this.ensurePasswordNotReused(record.staffId, dto.newPassword, staff.passwordHash);
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.$transaction(async (tx) => {
      await tx.passwordHistory.create({
        data: {
          staffId: record.staffId,
          passwordHash: staff.passwordHash,
        },
      });

      await tx.staff.update({
        where: { id: record.staffId },
        data: {
          passwordHash,
          mustChangePassword: false,
          passwordUpdatedAt: new Date(),
        },
      });

      await tx.session.updateMany({
        where: { staffId: record.staffId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await tx.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          staffId: record.staffId,
          action: 'PASSWORD_RESET_COMPLETED',
          entity: 'Staff',
          entityId: record.staffId,
          changes: { method: 'reset_token' },
        },
      });
    });

    return { message: this.i18n.t('error.success.resetPassword') };
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredTokens() {
    const result = await this.prisma.passwordResetToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { usedAt: { not: null } },
        ],
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired/used password reset tokens`);
    }
  }

  private async logLoginAttempt(input: {
    staffId: string | null;
    entityId: string;
    success: boolean;
    ipAddress?: string;
    userAgent?: string;
  }) {
    await this.prisma.auditLog.create({
      data: {
        staffId: input.staffId,
        action: 'LOGIN',
        entity: 'Staff',
        entityId: input.entityId,
        changes: {
          success: input.success,
          attemptedAt: new Date().toISOString(),
        },
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }

  private async ensurePasswordNotReused(
    staffId: string,
    candidatePassword: string,
    currentPasswordHash: string,
  ) {
    const history = await this.prisma.passwordHistory.findMany({
      where: { staffId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { passwordHash: true },
    });

    const previousHashes = [currentPasswordHash, ...history.map((item) => item.passwordHash)];
    for (const passwordHash of previousHashes) {
      if (await bcrypt.compare(candidatePassword, passwordHash)) {
        throw new BadRequestException('error.auth.passwordHistory');
      }
    }
  }
}

function parseJwtDuration(value: string) {
  const match = value.trim().match(/^(\d+)\s*([smhd])$/i);
  if (!match) {
    return 24 * 60 * 60 * 1000;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  if (unit === 's') return amount * 1000;
  if (unit === 'm') return amount * 60 * 1000;
  if (unit === 'h') return amount * 60 * 60 * 1000;
  return amount * 24 * 60 * 60 * 1000;
}
