import { Controller, Get, Post, Query, Req, Res, UnauthorizedException, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('google')
  redirectToGoogle(@Res() response: Response) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const redirectUri = this.configService.get<string>('GOOGLE_REDIRECT_URI');

    if (!clientId || !redirectUri) {
      throw new UnauthorizedException('Google OAuth is not configured');
    }

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'select_account');

    response.redirect(url.toString());
  }

  @Get('google/callback')
  async googleCallback(@Query('code') code: string | undefined, @Res() response: Response) {
    if (!code) {
      throw new UnauthorizedException('Missing OAuth code');
    }

    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('GOOGLE_REDIRECT_URI');

    if (!clientId || !clientSecret || !redirectUri) {
      throw new UnauthorizedException('Google OAuth is not configured');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      throw new UnauthorizedException('Failed to exchange Google OAuth code');
    }

    const tokenData = await tokenResponse.json() as { access_token?: string };

    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userInfoResponse.ok) {
      throw new UnauthorizedException('Failed to load Google user info');
    }

    const profile = await userInfoResponse.json() as { email?: string; verified_email?: boolean };
    const authResult = await this.authService.authenticateGoogleUser(profile);
    const cookie = this.authService.buildSessionCookie(authResult.sessionToken);

    response.cookie(cookie.name, cookie.value, cookie.options as any);
    response.redirect(this.authService.getFrontendRedirectUrl());
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@CurrentUser() user: any) {
    const [permissions, currentUser] = await Promise.all([
      this.prisma.userPermission.findMany({
        where: { userId: user.id },
        select: { permission: { select: { key: true, description: true } } },
      }),
      this.prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, email: true, firstName: true, lastName: true, companyId: true },
      }),
    ]);

    return {
      authenticated: true,
      user: {
        id: currentUser?.id ?? user.id,
        email: currentUser?.email ?? user.email,
        firstName: currentUser?.firstName ?? user.firstName,
        lastName: currentUser?.lastName ?? user.lastName,
      },
      companyId: currentUser?.companyId ?? null,
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
