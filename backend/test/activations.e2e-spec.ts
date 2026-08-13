import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { App } from 'supertest/types';
import { ActivationsController } from '../src/modules/activations/activations.controller';
import { ActivationsService } from '../src/modules/activations/activations.service';
import { DevelopmentOtpService } from '../src/modules/activations/otp/development-otp.service';
import { OtpService } from '../src/modules/activations/otp/otp.service';
import { AuthGuard } from '../src/modules/auth/auth.guard';
import { PermissionGuard } from '../src/modules/auth/permission.guard';
import { AuthService } from '../src/modules/auth/auth.service';
import { AuthController } from '../src/modules/auth/auth.controller';
import { PrismaService } from '../src/prisma/prisma.service';
import { Logger } from '@nestjs/common';

describe('Activations e2e', () => {
  let app: INestApplication<App>;
  let prismaMock: any;
  let warnSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;
  let authServiceMock: any;
  let state: {
    users: Map<string, any>;
    activations: Map<string, any>;
    otpChallenges: Map<string, any>;
    permissionsEnabled: boolean;
    createdSessions: string[];
  };
  const creatorUserId = '11111111-1111-4111-8111-111111111111';
  const targetUserId = '22222222-2222-4222-8222-222222222222';
  const otherCompanyUserId = '33333333-3333-4333-8333-333333333333';
  const linkedUserId = '55555555-5555-4555-8555-555555555555';

  beforeEach(async () => {
    state = {
      users: new Map<string, any>([
        [creatorUserId, { id: creatorUserId, companyId: 'company-1', firstName: 'Creator', lastName: 'User', email: 'creator@example.com', phone: '0500000001', isActive: true, activatedAt: new Date('2026-01-01T00:00:00.000Z') }],
        [targetUserId, { id: targetUserId, companyId: 'company-1', firstName: 'Target', lastName: 'User', email: 'target@example.com', phone: '0547724987', isActive: true, activatedAt: null }],
        [otherCompanyUserId, { id: otherCompanyUserId, companyId: 'company-2', firstName: 'Other', lastName: 'Company', email: 'other@example.com', phone: '0500009999', isActive: true, activatedAt: null }],
        [linkedUserId, { id: linkedUserId, companyId: 'company-1', firstName: 'Linked', lastName: 'User', email: 'linked@example.com', phone: '0508888888', isActive: true, activatedAt: new Date('2026-01-01T00:00:00.000Z'), googleSubject: 'google-sub-existing' }],
      ]),
      activations: new Map<string, any>(),
      otpChallenges: new Map<string, any>(),
      permissionsEnabled: true,
      createdSessions: [],
    };

    prismaMock = {
      $transaction: jest.fn(async (callback: any) => callback({
        activation: prismaMock.activation,
        activationOtpChallenge: prismaMock.activationOtpChallenge,
        user: prismaMock.user,
      })),
      user: {
        findUnique: jest.fn(async ({ where, select }: any) => {
          const id = where?.id;
          const user = id ? state.users.get(id) ?? null : null;
          if (!user) {
            return null;
          }

          if (!select) {
            return user;
          }

          return Object.fromEntries(Object.keys(select).map((key) => [key, user[key]]));
        }),
        findFirst: jest.fn(async ({ where, select }: any) => {
          const users = Array.from(state.users.values());
          const user = users.find((candidate) => {
            if (where?.googleSubject !== undefined && candidate.googleSubject !== where.googleSubject) {
              return false;
            }

            if (where?.id?.not !== undefined && candidate.id === where.id.not) {
              return false;
            }

            return true;
          }) ?? null;

          if (!user) {
            return null;
          }

          if (!select) {
            return user;
          }

          return Object.fromEntries(Object.keys(select).map((key) => [key, user[key]]));
        }),
        update: jest.fn(async ({ where: { id }, data }: any) => {
          const user = state.users.get(id);
          if (!user) {
            return null;
          }

          const updatedUser = { ...user, ...data };
          state.users.set(id, updatedUser);
          return updatedUser;
        }),
      },
      userPermission: {
        findMany: jest.fn(async () => (state.permissionsEnabled ? [{ permission: { key: 'MANAGE_COMPANIES' } }] : [])),
      },
      activation: {
        findUnique: jest.fn(async ({ where, select }: any) => {
          const activation = Array.from(state.activations.values()).find((item) => (where?.tokenHash ? item.tokenHash === where.tokenHash : item.id === where?.id)) ?? null;

          if (!activation) {
            return null;
          }

          const fullActivation = {
            ...activation,
            user: state.users.get(activation.userId),
          };

          if (!select) {
            return fullActivation;
          }

          const selected: Record<string, unknown> = {};
          for (const key of Object.keys(select)) {
            if (key === 'user' && select.user) {
              const userSelect = select.user.select ?? {};
              selected.user = Object.fromEntries(
                Object.keys(userSelect).map((userKey) => [userKey, fullActivation.user?.[userKey]]),
              );
            } else {
              selected[key] = fullActivation[key];
            }
          }

          return selected;
        }),
        updateMany: jest.fn(async ({ where, data }: any) => {
          let count = 0;
          for (const activation of state.activations.values()) {
            const matches =
              activation.userId === where.userId &&
              activation.usedAt === where.usedAt &&
              activation.revokedAt === where.revokedAt &&
              activation.expiresAt > where.expiresAt.gt;

            if (matches) {
              activation.revokedAt = data.revokedAt;
              count += 1;
            }
          }

          return { count };
        }),
        create: jest.fn(async ({ data, select }: any) => {
          const activation = {
            id: randomUUID(),
            userId: data.userId,
            createdByUserId: data.createdByUserId,
            companyId: data.companyId,
            tokenHash: data.tokenHash,
            expiresAt: data.expiresAt,
            usedAt: null,
            revokedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          state.activations.set(activation.id, activation);

          if (!select) {
            return activation;
          }

          return Object.fromEntries(Object.keys(select).map((key) => [key, activation[key]]));
        }),
        update: jest.fn(async ({ where: { id }, data }: any) => {
          const activation = state.activations.get(id);
          if (!activation) {
            return null;
          }

          const updated = { ...activation, ...data };
          state.activations.set(id, updated);
          return updated;
        }),
      },
      activationOtpChallenge: {
        updateMany: jest.fn(async ({ where, data }: any) => {
          let count = 0;
          for (const challenge of state.otpChallenges.values()) {
            const matches =
              challenge.activationId === where.activationId &&
              challenge.usedAt === where.usedAt &&
              challenge.lockedAt === where.lockedAt &&
              challenge.expiresAt > where.expiresAt.gt;

            if (matches) {
              challenge.lockedAt = data.lockedAt;
              count += 1;
            }
          }

          return { count };
        }),
        create: jest.fn(async ({ data, select }: any) => {
          const challenge = {
            id: randomUUID(),
            activationId: data.activationId,
            codeHash: data.codeHash,
            expiresAt: data.expiresAt,
            usedAt: null,
            attemptCount: 0,
            maxAttempts: data.maxAttempts,
            lockedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          state.otpChallenges.set(challenge.id, challenge);

          if (!select) {
            return challenge;
          }

          return Object.fromEntries(Object.keys(select).map((key) => [key, challenge[key]]));
        }),
        findFirst: jest.fn(async ({ where: { activationId }, orderBy, select }: any) => {
          const challenges = Array.from(state.otpChallenges.values())
            .filter((item) => item.activationId === activationId)
            .sort((left, right) => {
              if (orderBy?.createdAt === 'desc') {
                return right.createdAt.getTime() - left.createdAt.getTime();
              }
              return left.createdAt.getTime() - right.createdAt.getTime();
            });

          const challenge = challenges[0] ?? null;

          if (!challenge) {
            return null;
          }

          if (!select) {
            return challenge;
          }

          return Object.fromEntries(Object.keys(select).map((key) => [key, challenge[key]]));
        }),
        update: jest.fn(async ({ where: { id }, data }: any) => {
          const challenge = state.otpChallenges.get(id);
          if (!challenge) {
            return null;
          }

          const updated = { ...challenge, ...data };
          state.otpChallenges.set(id, updated);
          return updated;
        }),
      },
    };

    authServiceMock = {
      getSessionUser: jest.fn((sessionToken: string) => (sessionToken === 'test-session' ? creatorUserId : undefined)),
      clearSession: jest.fn(),
      buildSessionCookie: jest.fn((value: string) => ({
        name: 'app_session',
        value,
        options: { httpOnly: true, sameSite: 'lax', path: '/' },
      })),
      getFrontendRedirectUrl: jest.fn(() => 'http://localhost:5173'),
      authenticateGoogleUser: jest.fn(),
      createSessionToken: jest.fn((userId: string) => {
        const token = `${userId}.session-token`;
        state.createdSessions.push(token);
        return token;
      }),
      normalizeEmail: jest.fn((email: string) => email.trim().toLowerCase()),
      buildGoogleAuthorizationUrl: jest.fn((stateValue?: string) => {
        const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        if (stateValue) {
          url.searchParams.set('state', stateValue);
        }
        return url.toString();
      }),
      exchangeGoogleCode: jest.fn(async (code: string) => ({
        sub: code === 'collision-code' ? 'google-sub-existing' : 'google-sub-new',
        email: code === 'normal-login-code' ? 'target@example.com' : 'linked@example.com',
        verified_email: true,
      })),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ActivationsController, AuthController],
      providers: [
        ActivationsService,
        DevelopmentOtpService,
        AuthGuard,
        PermissionGuard,
        {
          provide: OtpService,
          useExisting: DevelopmentOtpService,
        },
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const values: Record<string, string> = {
                FRONTEND_URL: 'http://localhost:5173',
                NODE_ENV: 'test',
                OTP_LENGTH: '6',
                OTP_TTL_SECONDS: '300',
                OTP_MAX_ATTEMPTS: '5',
                OTP_HASH_SECRET: 'test-otp-secret',
                GOOGLE_CLIENT_ID: 'client-id',
                GOOGLE_CLIENT_SECRET: 'client-secret',
                GOOGLE_REDIRECT_URI: 'http://localhost:3000/auth/google/callback',
              };

              return values[key];
            }),
          },
        },
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    app.use((req: any, _res: any, next: () => void) => {
      if (!req.headers.cookie) {
        req.headers.cookie = 'app_session=test-session';
      }
      next();
    });
    await app.init();
  });

  afterEach(async () => {
    warnSpy.mockRestore();
    logSpy.mockRestore();
    await app.close();
  });

  async function createActivationToken() {
    const response = await request(app.getHttpServer())
      .post('/activations')
      .send({ userId: targetUserId })
      .expect(201);

    return response.body.activationUrl.split('/').pop() as string;
  }

  async function requestOtpForActivation(token: string) {
    logSpy.mockClear();

    const response = await request(app.getHttpServer())
      .post(`/activations/${token}/request-otp`)
      .expect(201);

    const message = logSpy.mock.calls.map(([entry]) => String(entry)).findLast((entry) => entry.includes('Development OTP for activation'));
    const otp = message?.split(': ').pop();

    return {
      response,
      otp,
      challenge: Array.from(state.otpChallenges.values()).sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0],
    };
  }

  async function completeOtpVerification(token: string) {
    await request(app.getHttpServer())
      .post(`/activations/${token}/verify-phone`)
      .send({ phone: '0547724987' })
      .expect(201);

    const { otp } = await requestOtpForActivation(token);

    await request(app.getHttpServer())
      .post(`/activations/${token}/verify-otp`)
      .send({ otp })
      .expect(201);
  }

  it('creates an activation for an existing user in the same company', async () => {
    const res = await request(app.getHttpServer())
      .post('/activations')
      .send({ userId: targetUserId })
      .expect(201);

    expect(res.body).toMatchObject({
      userId: targetUserId,
      createdByUserId: creatorUserId,
      companyId: 'company-1',
    });
    expect(res.body.activationUrl).toMatch(/^http:\/\/localhost:5173\/activate\//);
    expect(res.body).not.toHaveProperty('tokenHash');

    const token = res.body.activationUrl.split('/').pop();
    const activation = Array.from(state.activations.values())[0];
    expect(token).toBeDefined();
    expect(activation.tokenHash).not.toBe(token);
    expect(activation.tokenHash).toHaveLength(64);
    expect(new Date(res.body.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('rejects unauthenticated activation creation requests', async () => {
    await request(app.getHttpServer())
      .post('/activations')
      .set('Cookie', 'app_session=missing-session')
      .send({ userId: targetUserId })
      .expect(401);
  });

  it('rejects users without the required permission', async () => {
    state.permissionsEnabled = false;

    await request(app.getHttpServer())
      .post('/activations')
      .send({ userId: targetUserId })
      .expect(403);
  });

  it('rejects cross-company activation attempts', async () => {
    await request(app.getHttpServer())
      .post('/activations')
      .send({ userId: otherCompanyUserId })
      .expect(404);
  });

  it('rejects activation creation for an already activated user', async () => {
    state.users.set(targetUserId, {
      ...state.users.get(targetUserId),
      activatedAt: new Date('2026-02-01T00:00:00.000Z'),
    });

    await request(app.getHttpServer())
      .post('/activations')
      .send({ userId: targetUserId })
      .expect(409);
  });

  it('revokes a previous pending activation before creating a new one', async () => {
    const previousActivation = {
      id: 'activation-1',
      userId: targetUserId,
      createdByUserId: creatorUserId,
      companyId: 'company-1',
      tokenHash: 'existing-hash',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      usedAt: null,
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    state.activations.set(previousActivation.id, previousActivation);

    await request(app.getHttpServer())
      .post('/activations')
      .send({ userId: targetUserId })
      .expect(201);

    expect(state.activations.get('activation-1')?.revokedAt).toBeInstanceOf(Date);
    expect(state.activations.size).toBe(2);
  });

  it('inspects a valid activation token safely', async () => {
    const token = await createActivationToken();

    const res = await request(app.getHttpServer())
      .get(`/activations/${token}`)
      .expect(200);

    expect(res.body).toMatchObject({
      user: {
        id: targetUserId,
        firstName: 'Target',
        lastName: 'User',
      },
    });
    expect(res.body).not.toHaveProperty('tokenHash');
    expect(res.body.user).not.toHaveProperty('phone');
  });

  it('rejects an unknown activation token', async () => {
    await request(app.getHttpServer())
      .get('/activations/unknown-token')
      .expect(404);
  });

  it('rejects an expired activation token', async () => {
    const token = await createActivationToken();
    const activation = Array.from(state.activations.values())[0];
    activation.expiresAt = new Date(Date.now() - 1000);

    await request(app.getHttpServer())
      .get(`/activations/${token}`)
      .expect(400);
  });

  it('rejects a revoked activation token', async () => {
    const token = await createActivationToken();
    const activation = Array.from(state.activations.values())[0];
    activation.revokedAt = new Date();

    await request(app.getHttpServer())
      .get(`/activations/${token}`)
      .expect(400);
  });

  it('rejects a used activation token', async () => {
    const token = await createActivationToken();
    const activation = Array.from(state.activations.values())[0];
    activation.usedAt = new Date();

    await request(app.getHttpServer())
      .get(`/activations/${token}`)
      .expect(400);
  });

  it('verifies the correct phone without creating a session or linking Google', async () => {
    const token = await createActivationToken();

    const res = await request(app.getHttpServer())
      .post(`/activations/${token}/verify-phone`)
      .send({ phone: '(054) 772-4987' })
      .expect(201);

    expect(res.body).toEqual({ verified: true, activationId: expect.any(String) });
    expect(state.users.get(targetUserId)?.phoneVerifiedAt).toBeInstanceOf(Date);
    expect(state.users.get(targetUserId)?.googleSubject ?? null).toBeNull();
  });

  it('rejects an incorrect phone generically and does not verify the user', async () => {
    const token = await createActivationToken();

    const res = await request(app.getHttpServer())
      .post(`/activations/${token}/verify-phone`)
      .send({ phone: '0500000000' })
      .expect(400);

    expect(res.body.message).toBe('Verification failed');
    expect(state.users.get(targetUserId)?.phoneVerifiedAt ?? null).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('does not allow a token to resolve a different user', async () => {
    const token = await createActivationToken();

    const res = await request(app.getHttpServer())
      .get(`/activations/${token}`)
      .expect(200);

    expect(res.body.user.id).toBe(targetUserId);
    expect(res.body.user.id).not.toBe(otherCompanyUserId);
  });

  it('does not issue OTP before phone verification', async () => {
    const token = await createActivationToken();

    await request(app.getHttpServer())
      .post(`/activations/${token}/request-otp`)
      .expect(400);
  });

  it('issues OTP after successful phone verification and persists the hashed challenge', async () => {
    const token = await createActivationToken();
    await request(app.getHttpServer())
      .post(`/activations/${token}/verify-phone`)
      .send({ phone: '0547724987' })
      .expect(201);

    const { response, otp, challenge } = await requestOtpForActivation(token);

    expect(response.body).toMatchObject({
      challengeId: expect.any(String),
      activationId: expect.any(String),
      maxAttempts: 5,
    });
    expect(otp).toMatch(/^\d{6}$/);
    expect(challenge.codeHash).not.toBe(otp);
    expect(challenge.codeHash).toHaveLength(64);
    expect(new Date(response.body.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('verifies the correct OTP without creating a session or activating the user', async () => {
    const token = await createActivationToken();
    await request(app.getHttpServer())
      .post(`/activations/${token}/verify-phone`)
      .send({ phone: '0547724987' })
      .expect(201);

    const { otp, challenge } = await requestOtpForActivation(token);

    const res = await request(app.getHttpServer())
      .post(`/activations/${token}/verify-otp`)
      .send({ otp })
      .expect(201);

    expect(res.body).toEqual({ verified: true, activationId: expect.any(String), challengeId: challenge.id });
    expect(state.otpChallenges.get(challenge.id)?.usedAt).toBeInstanceOf(Date);
    expect(state.users.get(targetUserId)?.activatedAt ?? null).toBeNull();
    expect(state.users.get(targetUserId)?.googleSubject ?? null).toBeNull();
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('increments attemptCount on incorrect OTP and fails generically', async () => {
    const token = await createActivationToken();
    await request(app.getHttpServer())
      .post(`/activations/${token}/verify-phone`)
      .send({ phone: '0547724987' })
      .expect(201);

    const { challenge } = await requestOtpForActivation(token);

    const res = await request(app.getHttpServer())
      .post(`/activations/${token}/verify-otp`)
      .send({ otp: '000000' })
      .expect(400);

    expect(res.body.message).toBe('OTP verification failed');
    expect(state.otpChallenges.get(challenge.id)?.attemptCount).toBe(1);
  });

  it('locks the challenge after the maximum number of failed attempts', async () => {
    const token = await createActivationToken();
    await request(app.getHttpServer())
      .post(`/activations/${token}/verify-phone`)
      .send({ phone: '0547724987' })
      .expect(201);

    const { challenge } = await requestOtpForActivation(token);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app.getHttpServer())
        .post(`/activations/${token}/verify-otp`)
        .send({ otp: '000000' })
        .expect(400);
    }

    expect(state.otpChallenges.get(challenge.id)?.attemptCount).toBe(5);
    expect(state.otpChallenges.get(challenge.id)?.lockedAt).toBeInstanceOf(Date);
  });

  it('rejects locked, used, and expired OTP challenges', async () => {
    const token = await createActivationToken();
    await request(app.getHttpServer())
      .post(`/activations/${token}/verify-phone`)
      .send({ phone: '0547724987' })
      .expect(201);

    let otpFlow = await requestOtpForActivation(token);
    state.otpChallenges.get(otpFlow.challenge.id)!.lockedAt = new Date();
    await request(app.getHttpServer())
      .post(`/activations/${token}/verify-otp`)
      .send({ otp: otpFlow.otp })
      .expect(400);

    otpFlow = await requestOtpForActivation(token);
    state.otpChallenges.get(otpFlow.challenge.id)!.usedAt = new Date();
    await request(app.getHttpServer())
      .post(`/activations/${token}/verify-otp`)
      .send({ otp: otpFlow.otp })
      .expect(400);

    otpFlow = await requestOtpForActivation(token);
    state.otpChallenges.get(otpFlow.challenge.id)!.expiresAt = new Date(Date.now() - 1000);
    await request(app.getHttpServer())
      .post(`/activations/${token}/verify-otp`)
      .send({ otp: otpFlow.otp })
      .expect(400);
  });

  it('invalidates the previous active OTP challenge when a new OTP is requested', async () => {
    const token = await createActivationToken();
    await request(app.getHttpServer())
      .post(`/activations/${token}/verify-phone`)
      .send({ phone: '0547724987' })
      .expect(201);

    const first = await requestOtpForActivation(token);
    const second = await requestOtpForActivation(token);

    expect(state.otpChallenges.get(first.challenge.id)?.lockedAt).toBeInstanceOf(Date);
    expect(state.otpChallenges.get(second.challenge.id)?.lockedAt ?? null).toBeNull();
  });

  it('does not allow an OTP from one activation to verify another activation', async () => {
    const secondTargetUserId = '44444444-4444-4444-8444-444444444444';
    state.users.set(secondTargetUserId, {
      id: secondTargetUserId,
      companyId: 'company-1',
      firstName: 'Second',
      lastName: 'Target',
      email: 'second@example.com',
      phone: '0501234567',
      isActive: true,
      activatedAt: null,
      phoneVerifiedAt: new Date(),
    });

    const firstToken = await createActivationToken();
    await request(app.getHttpServer())
      .post(`/activations/${firstToken}/verify-phone`)
      .send({ phone: '0547724987' })
      .expect(201);
    const firstFlow = await requestOtpForActivation(firstToken);

    const secondActivationRes = await request(app.getHttpServer())
      .post('/activations')
      .send({ userId: secondTargetUserId })
      .expect(201);
    const secondToken = secondActivationRes.body.activationUrl.split('/').pop();

    await request(app.getHttpServer())
      .post(`/activations/${secondToken}/request-otp`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/activations/${secondToken}/verify-otp`)
      .send({ otp: firstFlow.otp })
      .expect(400);
  });

  it('does not start Google linking before phone verification', async () => {
    const token = await createActivationToken();

    await request(app.getHttpServer())
      .get(`/activations/${token}/link-google`)
      .expect(400);
  });

  it('does not start Google linking before successful OTP verification', async () => {
    const token = await createActivationToken();
    await request(app.getHttpServer())
      .post(`/activations/${token}/verify-phone`)
      .send({ phone: '0547724987' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/activations/${token}/link-google`)
      .expect(400);
  });

  it('starts Google linking with an unpredictable state bound to the activation', async () => {
    const token = await createActivationToken();
    await completeOtpVerification(token);

    const first = await request(app.getHttpServer())
      .get(`/activations/${token}/link-google`)
      .redirects(0)
      .expect(302);
    const second = await request(app.getHttpServer())
      .get(`/activations/${token}/link-google`)
      .redirects(0)
      .expect(302);

    const firstState = new URL(first.headers.location).searchParams.get('state');
    const secondState = new URL(second.headers.location).searchParams.get('state');

    expect(firstState).toBeTruthy();
    expect(secondState).toBeTruthy();
    expect(firstState).not.toBe(secondState);
  });

  it('rejects expired, revoked, and used activations before Google linking starts', async () => {
    let token = await createActivationToken();
    await completeOtpVerification(token);
    Array.from(state.activations.values())[0].expiresAt = new Date(Date.now() - 1000);
    await request(app.getHttpServer())
      .get(`/activations/${token}/link-google`)
      .expect(400);

    state.activations.clear();
    token = await createActivationToken();
    await completeOtpVerification(token);
    Array.from(state.activations.values())[0].revokedAt = new Date();
    await request(app.getHttpServer())
      .get(`/activations/${token}/link-google`)
      .expect(400);

    state.activations.clear();
    token = await createActivationToken();
    await completeOtpVerification(token);
    Array.from(state.activations.values())[0].usedAt = new Date();
    await request(app.getHttpServer())
      .get(`/activations/${token}/link-google`)
      .expect(400);
  });

  it('rejects expired and reused OAuth states', async () => {
    const token = await createActivationToken();
    await completeOtpVerification(token);

    const start = await request(app.getHttpServer())
      .get(`/activations/${token}/link-google`)
      .redirects(0)
      .expect(302);
    const stateValue = new URL(start.headers.location).searchParams.get('state');
    expect(stateValue).toBeTruthy();

    await request(app.getHttpServer())
      .get('/auth/google/callback')
      .query({ code: 'link-code', state: stateValue })
      .redirects(0)
      .expect(302);

    await request(app.getHttpServer())
      .get('/auth/google/callback')
      .query({ code: 'link-code', state: stateValue })
      .expect(400);
  });

  it('completes Google linking, stores googleSubject, activates the user, creates a session, and consumes the activation', async () => {
    const token = await createActivationToken();
    await completeOtpVerification(token);
    authServiceMock.authenticateGoogleUser.mockClear();

    const start = await request(app.getHttpServer())
      .get(`/activations/${token}/link-google`)
      .redirects(0)
      .expect(302);
    const stateValue = new URL(start.headers.location).searchParams.get('state');

    const callback = await request(app.getHttpServer())
      .get('/auth/google/callback')
      .query({ code: 'link-code', state: stateValue })
      .redirects(0)
      .expect(302);

    const user = state.users.get(targetUserId);
    const activation = Array.from(state.activations.values())[0];

    expect(user.googleSubject).toBe('google-sub-new');
    expect(user.googleLinkedAt).toBeInstanceOf(Date);
    expect(user.activatedAt).toBeInstanceOf(Date);
    expect(activation.usedAt).toBeInstanceOf(Date);
    expect(state.createdSessions).toHaveLength(1);
    expect(authServiceMock.authenticateGoogleUser).not.toHaveBeenCalled();
    expect(callback.headers['set-cookie']).toBeDefined();
  });

  it('rejects Google subject collisions without partially activating the target user', async () => {
    const token = await createActivationToken();
    await completeOtpVerification(token);

    const start = await request(app.getHttpServer())
      .get(`/activations/${token}/link-google`)
      .redirects(0)
      .expect(302);
    const stateValue = new URL(start.headers.location).searchParams.get('state');

    const activation = Array.from(state.activations.values())[0];

    await request(app.getHttpServer())
      .get('/auth/google/callback')
      .query({ code: 'collision-code', state: stateValue })
      .expect(409);

    const user = state.users.get(targetUserId);
    expect(user.googleSubject ?? null).toBeNull();
    expect(user.activatedAt ?? null).toBeNull();
    expect(activation.usedAt ?? null).toBeNull();
  });

  it('keeps the existing normal login flow unchanged when no OAuth state is supplied', async () => {
    authServiceMock.authenticateGoogleUser.mockResolvedValueOnce({
      user: {
        id: targetUserId,
        email: 'target@example.com',
        firstName: 'Target',
        lastName: 'User',
        isActive: true,
      },
      sessionToken: `${targetUserId}.existing-login-session`,
    });

    const res = await request(app.getHttpServer())
      .get('/auth/google/callback')
      .query({ code: 'normal-login-code' })
      .redirects(0)
      .expect(302);

    expect(authServiceMock.authenticateGoogleUser).toHaveBeenCalled();
    expect(res.headers['set-cookie']).toBeDefined();
  });
});