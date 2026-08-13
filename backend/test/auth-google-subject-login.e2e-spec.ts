import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/modules/auth/auth.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth Google Subject Login e2e', () => {
  let app: INestApplication<App>;
  let prisma: any;
  let authService: AuthService;

  beforeEach(async () => {
    prisma = {
      company: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      userPermission: {
        findMany: jest.fn(),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(ConfigService)
      .useValue({
        get: jest.fn((key: string) => {
          const values: Record<string, string> = {
            GOOGLE_CLIENT_ID: 'client-id',
            GOOGLE_CLIENT_SECRET: 'client-secret',
            GOOGLE_REDIRECT_URI: 'http://localhost:3000/auth/google/callback',
            FRONTEND_URL: 'http://localhost:5173',
            SESSION_SECRET: 'test-secret',
            NODE_ENV: 'test',
          };
          return values[key];
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    authService = app.get(AuthService);
  });

  afterEach(async () => {
    await app.close();
  });

  it('authenticates an existing user with matching googleSubject', async () => {
    jest.spyOn(authService, 'exchangeGoogleCode').mockResolvedValue({
      sub: 'google-subject-1',
      email: 'someone@example.com',
      verified_email: true,
    });

    prisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      email: 'member@example.com',
      firstName: 'Member',
      lastName: 'User',
      isActive: true,
    });
    prisma.user.update.mockResolvedValue({ id: 'user-1', lastLoginAt: new Date() });

    const res = await request(app.getHttpServer())
      .get('/auth/google/callback')
      .query({ code: 'existing-user-code' })
      .redirects(0)
      .expect(302);

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { googleSubject: 'google-subject-1' },
      select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { lastLoginAt: expect.any(Date) },
    });
    expect(res.headers.location).toBe('http://localhost:5173');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('rejects login when Google subject is unknown', async () => {
    jest.spyOn(authService, 'exchangeGoogleCode').mockResolvedValue({
      sub: 'unknown-subject',
      email: 'known@example.com',
      verified_email: true,
    });

    prisma.user.findFirst.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .get('/auth/google/callback')
      .query({ code: 'unknown-subject-code' })
      .expect(401);

    expect(res.body.message).toBe('Authentication failed');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects login when email matches a user but googleSubject is null', async () => {
    jest.spyOn(authService, 'exchangeGoogleCode').mockResolvedValue({
      sub: 'missing-link-subject',
      email: 'target@example.com',
      verified_email: true,
    });

    prisma.user.findFirst.mockResolvedValue(null);

    await request(app.getHttpServer())
      .get('/auth/google/callback')
      .query({ code: 'email-only-match-code' })
      .expect(401);

    expect(prisma.user.findMany).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('does not authenticate another user by email when Google subject belongs to no one', async () => {
    jest.spyOn(authService, 'exchangeGoogleCode').mockResolvedValue({
      sub: 'not-linked-subject',
      email: 'linked@example.com',
      verified_email: true,
    });

    prisma.user.findFirst.mockResolvedValue(null);

    await request(app.getHttpServer())
      .get('/auth/google/callback')
      .query({ code: 'cross-user-email-code' })
      .expect(401);

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { googleSubject: 'not-linked-subject' },
      select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
    });
    expect(prisma.user.findMany).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('normal login continues to create a session cookie for matched googleSubject', async () => {
    jest.spyOn(authService, 'exchangeGoogleCode').mockResolvedValue({
      sub: 'google-subject-session',
      email: 'session@example.com',
      verified_email: true,
    });

    prisma.user.findFirst.mockResolvedValue({
      id: 'session-user',
      email: 'session@example.com',
      firstName: 'Session',
      lastName: 'User',
      isActive: true,
    });
    prisma.user.update.mockResolvedValue({ id: 'session-user', lastLoginAt: new Date() });

    const res = await request(app.getHttpServer())
      .get('/auth/google/callback')
      .query({ code: 'session-code' })
      .redirects(0)
      .expect(302);

    const cookieHeader = (res.headers['set-cookie'] ?? [])[0] as string;
    expect(cookieHeader).toContain('app_session=session-user.');
    expect(cookieHeader).toContain('HttpOnly');
    expect(cookieHeader).toContain('Path=/');
    expect(cookieHeader).toContain('SameSite=Lax');
  });
});
