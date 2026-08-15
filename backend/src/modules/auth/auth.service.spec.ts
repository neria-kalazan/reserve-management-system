import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let config: any;

  afterEach(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    config = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          GOOGLE_CLIENT_ID: 'client-id',
          GOOGLE_CLIENT_SECRET: 'client-secret',
          GOOGLE_REDIRECT_URI: 'http://localhost:3000/auth/google/callback',
          FRONTEND_URL: 'http://localhost:5173',
          SESSION_SECRET: 'super-secret',
        };
        return values[key];
      }),
    };

    service = new AuthService(prisma, config as any);
  });

  it('normalizes Google email addresses', () => {
    expect(service.normalizeEmail('  Ada@Example.com  ')).toBe('ada@example.com');
  });

  it('resolves a Google identity to an existing active user and updates lastLoginAt', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'user-1', email: 'ada@example.com', firstName: 'Ada', lastName: 'Lovelace', isActive: true });
    prisma.user.update.mockResolvedValue({ id: 'user-1', lastLoginAt: new Date() });

    const result = await service.authenticateGoogleUser({ sub: 'google-sub-1', email: 'Ada@Example.com', verified_email: true } as any);

    expect(result.user.id).toBe('user-1');
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { googleSubject: 'google-sub-1' },
      select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
    });
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it('rejects an unknown Google identity', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(service.authenticateGoogleUser({ sub: 'missing-sub', email: 'unknown@example.com', verified_email: true } as any)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects inactive users', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'user-2', email: 'inactive@example.com', firstName: 'Inactive', lastName: 'User', isActive: false });

    await expect(service.authenticateGoogleUser({ sub: 'inactive-sub', email: 'inactive@example.com', verified_email: true } as any)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects identities without a Google subject', async () => {
    await expect(service.authenticateGoogleUser({ email: 'ada@example.com', verified_email: true } as any)).rejects.toThrow(UnauthorizedException);
  });

  it('creates a session cookie payload for a successful login', () => {
    const token = service.createSessionToken('user-1');
    const cookie = service.buildSessionCookie(token);

    expect(cookie.name).toBe('app_session');
    expect(cookie.value).toContain('.');
    expect(cookie.options.httpOnly).toBe(true);
    expect(cookie.options.maxAge).toBe(28_800_000);
  });

  it('keeps server-side sessions valid for eight hours', () => {
    const createdAt = new Date('2026-08-15T00:00:00.000Z');
    jest.useFakeTimers().setSystemTime(createdAt);
    const token = service.createSessionToken('user-1');

    jest.setSystemTime(new Date(createdAt.getTime() + 28_800_000 - 1));
    expect(service.getSessionUser(token)).toBe('user-1');

    jest.setSystemTime(new Date(createdAt.getTime() + 28_800_000));
    expect(service.getSessionUser(token)).toBeNull();
  });
});
