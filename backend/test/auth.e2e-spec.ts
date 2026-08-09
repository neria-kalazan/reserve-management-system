import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth e2e', () => {
  let app: INestApplication<App>;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
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
});
