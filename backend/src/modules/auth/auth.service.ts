import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { randomBytes } from 'node:crypto';

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export interface GoogleProfilePayload {
  sub?: string;
  email?: string;
  verified_email?: boolean;
}

export interface AuthenticatedUserPayload {
  user: {
    id: string;
    email: string | null;
    firstName: string;
    lastName: string;
    isActive: boolean;
  };
  sessionToken: string;
}

interface SessionRecord {
  userId: string;
  expiresAt: Date;
}

@Injectable()
export class AuthService {
  private readonly sessions = new Map<string, SessionRecord>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  buildGoogleAuthorizationUrl(state?: string) {
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

    if (state) {
      url.searchParams.set('state', state);
    }

    return url.toString();
  }

  async exchangeGoogleCode(code: string): Promise<GoogleProfilePayload> {
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

    const userInfoResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userInfoResponse.ok) {
      throw new UnauthorizedException('Failed to load Google user info');
    }

    const profile = await userInfoResponse.json() as { sub?: string; email?: string; email_verified?: boolean };

    return {
      sub: profile.sub,
      email: profile.email,
      verified_email: profile.email_verified,
    };
  }

  async authenticateGoogleUser(profile: GoogleProfilePayload): Promise<AuthenticatedUserPayload> {
    const googleSubject = profile.sub?.trim();

    if (!googleSubject) {
      throw new UnauthorizedException('Authentication failed');
    }

    const user = await this.prisma.user.findFirst({
      where: { googleSubject },
      select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('Authentication failed');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User is inactive');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
      },
      sessionToken: this.createSessionToken(user.id),
    };
  }

  createSessionToken(userId: string): string {
    const random = randomBytes(24).toString('hex');
    const token = `${userId}.${random}`;
    this.sessions.set(token, {
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    });
    return token;
  }

  getSessionUser(sessionToken: string) {
    this.cleanupExpiredSessions();
    const session = this.sessions.get(sessionToken);

    if (!session) {
      return null;
    }

    return session.userId;
  }

  clearSession(sessionToken: string) {
    this.sessions.delete(sessionToken);
  }

  private cleanupExpiredSessions() {
    const now = new Date();
    for (const [token, session] of this.sessions.entries()) {
      if (session.expiresAt <= now) {
        this.sessions.delete(token);
      }
    }
  }

  buildSessionCookie(value: string) {
    const isProduction = (this.configService.get<string>('NODE_ENV') ?? 'development').toLowerCase() === 'production';

    return {
      name: 'app_session',
      value,
      options: {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax' as const,
        path: '/',
        maxAge: SESSION_TTL_MS,
      },
    };
  }

  getFrontendRedirectUrl(): string {
    return this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
  }
}
