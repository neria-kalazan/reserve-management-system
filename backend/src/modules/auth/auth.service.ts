import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { randomBytes } from 'node:crypto';

export interface GoogleProfilePayload {
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

  async authenticateGoogleUser(profile: GoogleProfilePayload): Promise<AuthenticatedUserPayload> {
    const email = this.normalizeEmail(profile.email ?? '');

    if (!email || !profile.verified_email) {
      throw new UnauthorizedException('Google identity could not be verified');
    }

    const users = await this.prisma.user.findMany({
      where: { email },
      select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
    });

    const user = users[0];

    if (!user) {
      throw new UnauthorizedException('No matching application user found');
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
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
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
        maxAge: 60 * 60 * 8,
      },
    };
  }

  getFrontendRedirectUrl(): string {
    return this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
  }
}
