import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
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

  async login(loginDto: LoginDto) {
    const email = loginDto.email.toLowerCase();
    const staff = await this.prisma.staff.findUnique({
      where: { email },
    });

    if (!staff) {
      await this.logLoginAttempt({
        staffId: null,
        entityId: email,
        email,
        success: false,
        reason: 'STAFF_NOT_FOUND',
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      staff.passwordHash,
    );

    await this.logLoginAttempt({
      staffId: staff.id,
      entityId: staff.id,
      email: staff.email,
      success: passwordMatches && staff.isActive,
      reason: passwordMatches
        ? staff.isActive
          ? 'SUCCESS'
          : 'STAFF_INACTIVE'
        : 'INVALID_PASSWORD',
    });

    if (!passwordMatches || !staff.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: JwtPayload = {
      staffId: staff.id,
      email: staff.email,
      role: staff.role,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      mustChangePassword: staff.mustChangePassword,
      user: {
        id: staff.id,
        fullName: staff.fullName,
        email: staff.email,
        role: staff.role,
        mustChangePassword: staff.mustChangePassword,
      },
    };
  }

  async changePassword(staffId: string, dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('newPassword and confirmPassword must match');
    }

    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!staff?.isActive) {
      throw new UnauthorizedException('Staff account is inactive');
    }

    const currentPasswordMatches = await bcrypt.compare(
      dto.currentPassword,
      staff.passwordHash,
    );

    if (!currentPasswordMatches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    const updatedStaff = await this.prisma.staff.update({
      where: { id: staffId },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        mustChangePassword: true,
      },
    });

    return {
      user: updatedStaff,
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
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!staff?.isActive) {
      throw new UnauthorizedException('Staff account is inactive');
    }

    return staff;
  }

  private async logLoginAttempt(input: {
    staffId: string | null;
    entityId: string;
    email: string;
    success: boolean;
    reason: string;
  }) {
    await this.prisma.auditLog.create({
      data: {
        staffId: input.staffId,
        action: 'LOGIN',
        entity: 'Staff',
        entityId: input.entityId,
        changes: {
          email: input.email,
          success: input.success,
          reason: input.reason,
          attemptedAt: new Date().toISOString(),
        },
      },
    });
  }
}
