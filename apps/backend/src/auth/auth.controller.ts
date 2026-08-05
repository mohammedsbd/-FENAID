import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthenticatedRequest } from './types/authenticated-request.type';

// Express takes cookie maxAge in MILLISECONDS. A session ends only when the
// user logs out, so the cookie is given a 10-year lifetime rather than one
// that quietly runs out while they are working.
const SESSION_COOKIE_MAX_AGE_MS = 10 * 365 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.login(loginDto, {
      ipAddress: request.ip,
      userAgent: Array.isArray(request.headers['user-agent'])
        ? request.headers['user-agent'][0]
        : request.headers['user-agent'],
    });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: SESSION_COOKIE_MAX_AGE_MS,
    };

    response.cookie('token', result.accessToken, cookieOptions);
    response.cookie('session', JSON.stringify({
      id: result.user.id,
      role: result.user.role,
      fullName: result.user.fullName,
    }), { ...cookieOptions, httpOnly: false });

    return result;
  }

  @Post('change-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      request.user.staffId,
      request.user.sessionId,
      changePasswordDto,
    );
  }

  @Get('me')
  me(@Req() request: AuthenticatedRequest) {
    return this.authService.me(request.user.staffId);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('logout')
  logout(@Req() request: AuthenticatedRequest, @Res({ passthrough: true }) response: Response) {
    response.clearCookie('token', { path: '/' });
    response.clearCookie('session', { path: '/' });
    return this.authService.logout(request.user.sessionId);
  }
}
