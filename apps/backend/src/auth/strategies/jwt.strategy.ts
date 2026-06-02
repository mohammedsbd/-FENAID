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
      secretOrKey: configService.get<string>('JWT_SECRET', 'dev-jwt-secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const staff = await this.prisma.staff.findUnique({
      where: { id: payload.staffId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!staff?.isActive) {
      throw new UnauthorizedException('Staff account is inactive');
    }

    return {
      staffId: staff.id,
      email: staff.email,
      role: staff.role,
    };
  }
}
