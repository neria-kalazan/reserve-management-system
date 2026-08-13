import { Controller, Get, Inject, Post, Query, Req, Res, UnauthorizedException, UseGuards, UsePipes, ValidationPipe, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import type { AuthenticatedBusinessUser } from './authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivationsService } from '../activations/activations.service';

@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => ActivationsService))
    private readonly activationsService: ActivationsService,
  ) {}

  @Get('google')
  redirectToGoogle(@Res() response: Response) {
    response.redirect(this.authService.buildGoogleAuthorizationUrl());
  }

  @Get('google/callback')
  async googleCallback(@Query('code') code: string | undefined, @Query('state') state: string | undefined, @Res() response: Response) {
    if (!code) {
      throw new UnauthorizedException('Missing OAuth code');
    }

    if (state !== undefined) {
      const profile = await this.authService.exchangeGoogleCode(code);
      const authResult = await this.activationsService.completeGoogleLinking(state, profile);
      const cookie = this.authService.buildSessionCookie(authResult.sessionToken);

      response.cookie(cookie.name, cookie.value, cookie.options as any);
      response.redirect(this.authService.getFrontendRedirectUrl());
      return;
    }

    const profile = await this.authService.exchangeGoogleCode(code);
    const authResult = await this.authService.authenticateGoogleUser(profile);
    const cookie = this.authService.buildSessionCookie(authResult.sessionToken);

    response.cookie(cookie.name, cookie.value, cookie.options as any);
    response.redirect(this.authService.getFrontendRedirectUrl());
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@CurrentUser() user: AuthenticatedBusinessUser) {
    const permissions = await this.prisma.userPermission.findMany({
      where: { userId: user.id },
      select: { permission: { select: { key: true, description: true } } },
    });

    return {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        companyId: user.companyId,
      },
      permissions: permissions.map((item: any) => item.permission),
    };
  }

  @Post('logout')
  logout(@Req() req: Request, @Res() response: Response) {
    const sessionToken = this.getSessionToken(req);

    if (sessionToken) {
      this.authService.clearSession(sessionToken);
    }

    response.clearCookie('app_session', { path: '/', httpOnly: true, sameSite: 'lax' });
    response.status(204).send();
  }

  private getSessionToken(req: Request): string | undefined {
    const cookieHeader = req.headers.cookie ?? '';
    const cookies = Object.fromEntries(cookieHeader.split(';').filter(Boolean).map((item) => {
      const [name, ...rest] = item.trim().split('=');
      return [name, rest.join('=')];
    }));

    return cookies.app_session;
  }
}
