import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/modules/auth/auth.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth e2e', () => {
  let app: INestApplication<App>;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      company: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      user: {
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
      .overrideProvider(AuthService)
      .useValue({
        getSessionUser: jest.fn(() => 'user-1'),
        clearSession: jest.fn(),
        buildSessionCookie: jest.fn(),
        getFrontendRedirectUrl: jest.fn(),
        authenticateGoogleUser: jest.fn(),
        createSessionToken: jest.fn(),
        normalizeEmail: jest.fn(),
      })
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
  });

  afterEach(async () => {
    await app.close();
  });

  it('redirects to Google auth when requested', async () => {
    const res = await request(app.getHttpServer()).get('/auth/google').redirects(0);
    expect(res.status).toBe(302);
  });

  it('returns unauthenticated for /auth/me without a session', async () => {
    const res = await request(app.getHttpServer()).get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns the authenticated user and company id from /auth/me', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      firstName: 'Test',
      lastName: 'User',
      companyId: 'company-1',
      isActive: true,
    });
    prisma.userPermission.findMany.mockResolvedValue([{ permission: { key: 'MANAGE_COMPANIES', description: 'Manage companies' } }]);

    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', 'app_session=test-session')
      .expect(200);

    expect(res.body.authenticated).toBe(true);
    expect(res.body.user).toEqual({
      id: 'user-1',
      email: 'user@example.com',
      firstName: 'Test',
      lastName: 'User',
      companyId: 'company-1',
    });
    expect(res.body.permissions).toEqual([{ key: 'MANAGE_COMPANIES', description: 'Manage companies' }]);
    expect(res.body).not.toHaveProperty('companyId');
  });

  it('allows an authenticated user with the required permission to access a protected endpoint', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
    });
    prisma.userPermission.findMany.mockResolvedValue([{ permission: { key: 'MANAGE_COMPANIES' } }]);
    prisma.company.create.mockResolvedValue({
      id: 'company-1',
      name: 'Acme',
      status: 'ACTIVE',
      ownerUser: { id: 'user-1', firstName: 'Test', lastName: 'User' },
    });

    const res = await request(app.getHttpServer())
      .post('/companies')
      .set('Cookie', 'app_session=test-session')
      .send({ name: 'Acme' })
      .expect(201);

    expect(res.body.name).toBe('Acme');
    expect(prisma.company.create).toHaveBeenCalled();
  });

  it('returns 403 for an authenticated user without the required permission', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
    });
    prisma.userPermission.findMany.mockResolvedValue([{ permission: { key: 'VIEW_DASHBOARD' } }]);

    await request(app.getHttpServer())
      .post('/companies')
      .set('Cookie', 'app_session=test-session')
      .send({ name: 'Acme' })
      .expect(403);

    expect(prisma.company.create).not.toHaveBeenCalled();
  });

  it('returns 401 for a protected endpoint without a session', async () => {
    await request(app.getHttpServer()).post('/companies').send({ name: 'Acme' }).expect(401);
    expect(prisma.company.create).not.toHaveBeenCalled();
  });

  it('allows an authorized user to read protected company data', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
    });
    prisma.userPermission.findMany.mockResolvedValue([{ permission: { key: 'MANAGE_COMPANIES' } }]);
    prisma.company.findMany.mockResolvedValue([{ id: 'company-1', name: 'Acme', status: 'ACTIVE', ownerUser: { id: 'user-1', firstName: 'Test', lastName: 'User' } }]);

    const res = await request(app.getHttpServer())
      .get('/companies')
      .set('Cookie', 'app_session=test-session')
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Acme');
  });
});
