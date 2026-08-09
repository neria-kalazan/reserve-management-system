import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/modules/auth/auth.service';
import { AuthGuard } from '../src/modules/auth/auth.guard';
import { PermissionGuard } from '../src/modules/auth/permission.guard';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Task workspace e2e', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        userPermission: {
          findMany: jest.fn().mockResolvedValue([{ permission: { key: 'MANAGE_COMPANIES' } }]),
        },
        user: {
          findUnique: jest.fn().mockResolvedValue({ id: 'user-1', email: 'test@example.com', firstName: 'Test', lastName: 'User', isActive: true }),
          findMany: jest.fn().mockResolvedValue([{ id: 'user-1', userRoles: [], userQualifications: [] }]),
        },
        taskInstance: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'instance-1',
            title: 'Morning shift',
            startTime: new Date('2026-01-01T09:00:00.000Z'),
            endTime: new Date('2026-01-01T17:00:00.000Z'),
            activityTask: { id: 'task-1', name: 'Setup', activity: { id: 'activity-1' } },
          }),
        },
        activityTaskManpowerRequirement: {
          findUnique: jest.fn().mockResolvedValue({ required: true, quantity: 1 }),
        },
        activityTaskRoleRequirement: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        activityTaskQualificationRequirement: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        assignment: {
          findMany: jest.fn().mockResolvedValue([{ id: 'assignment-1', userId: 'user-1', user: { id: 'user-1', firstName: 'Ada', lastName: 'Lovelace' } }]),
        },
        activityUserStatus: {
          findMany: jest.fn().mockResolvedValue([{ status: 'ACTIVE', availability: 'ALL_DAY', user: { id: 'user-2', firstName: 'Grace', lastName: 'Hopper', phone: '', email: '', personalNumber: '', isActive: true } }]),
        },
        activityTask: {
          findUnique: jest.fn().mockResolvedValue({ id: 'task-1' }),
        },
        activityTaskRequirement: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      })
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
      .compile();

    app = moduleFixture.createNestApplication();
    app.use((req: any, _res: any, next: () => void) => {
      if (!req.headers.cookie) {
        req.headers.cookie = 'app_session=test-session';
      }
      next();
    });
    await app.init();
  });

  it('returns workspace data for a task instance', async () => {
    const res = await request(app.getHttpServer()).get('/task-instances/instance-1/workspace').expect(200);
    expect(res.body.taskInstance.id).toBe('instance-1');
    expect(res.body.requirements.manpower.required).toBe(true);
    expect(res.body.currentAssignments).toHaveLength(1);
    expect(res.body.candidates).toHaveLength(1);
  });

  afterEach(async () => {
    await app.close();
  });
});
