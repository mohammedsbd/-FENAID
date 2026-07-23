import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
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
      message: 'Password changed successfully. All other sessions have been revoked.',
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
