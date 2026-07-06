import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload.sessionId) {
      throw new UnauthorizedException('error.auth.invalidToken');
    }

    const [staff, session] = await Promise.all([
      this.prisma.staff.findUnique({
        where: { id: payload.staffId },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          deletedAt: true,
        },
      }),
      this.prisma.session.findUnique({
        where: { tokenId: payload.sessionId },
        select: {
          id: true,
          revokedAt: true,
          expiresAt: true,
          staffId: true,
        },
      }),
    ]);

    if (!staff?.isActive || staff.deletedAt) {
      throw new UnauthorizedException('error.auth.staffInactive');
    }

    if (!session || session.staffId !== staff.id || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('error.auth.sessionInactive');
    }

    await this.prisma.session.update({
      where: { tokenId: payload.sessionId },
      data: { lastSeenAt: new Date() },
    });

    return {
      staffId: staff.id,
      email: staff.email,
      role: staff.role,
      sessionId: payload.sessionId,
    };
  }
}
