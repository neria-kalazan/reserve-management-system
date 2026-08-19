import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { ActivityTasksController } from '../src/modules/activity-tasks/activity-tasks.controller';
import { ActivityTasksService } from '../src/modules/activity-tasks/activity-tasks.service';
import { ActivitiesController } from '../src/modules/activities/activities.controller';
import { ActivitiesService } from '../src/modules/activities/activities.service';
import { CompaniesController } from '../src/modules/companies/companies.controller';
import { CompaniesService } from '../src/modules/companies/companies.service';
import { AuthService } from '../src/modules/auth/auth.service';
import { AuthGuard } from '../src/modules/auth/auth.guard';
import { PermissionGuard } from '../src/modules/auth/permission.guard';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Activity tasks e2e', () => {
  let app: INestApplication<App>;
  let prismaMock: any;

  beforeEach(async () => {
    const state = {
      companies: new Map<string, any>(),
      activities: new Map<string, any>(),
      activityTasks: new Map<string, any>(),
    };

    prismaMock = {
      company: {
        create: jest.fn(async ({ data }: any) => {
          const company = {
            id: randomUUID(),
            name: data.name,
            status: data.status,
            ownerUserId: data.ownerUserId ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          state.companies.set(company.id, company);
          return company;
        }),
        findUnique: jest.fn(async ({ where: { id } }: any) => state.companies.get(id) ?? null),
      },
      activity: {
        create: jest.fn(async ({ data }: any) => {
          const activity = {
            id: randomUUID(),
            companyId: data.companyId,
            name: data.name,
            startDate: data.startDate,
            endDate: data.endDate,
            status: data.status,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          state.activities.set(activity.id, activity);
          return activity;
        }),
        findUnique: jest.fn(async ({ where: { id } }: any) => state.activities.get(id) ?? null),
        findMany: jest.fn(async ({ where: { companyId } }: any) => Array.from(state.activities.values()).filter((activity) => activity.companyId === companyId)),
      },
      userPermission: {
        findMany: jest.fn().mockResolvedValue([{ permission: { key: 'MANAGE_COMPANIES' } }]),
      },
      user: {
        findUnique: jest.fn(async ({ where: { id } }: any) => {
          if (id === 'user-1') {
            return { id: 'user-1', email: 'test@example.com', firstName: 'Test', lastName: 'User', isActive: true };
          }
          return null;
        }),
      },
      activityTask: {
        create: jest.fn(async ({ data }: any) => {
          const task = {
            id: randomUUID(),
            activityId: data.activityId,
            name: data.name,
            description: data.description ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          state.activityTasks.set(task.id, task);
          return task;
        }),
        findMany: jest.fn(async ({ where: { activityId } }: any) => Array.from(state.activityTasks.values()).filter((task) => task.activityId === activityId)),
        findUnique: jest.fn(async ({ where: { id } }: any) => state.activityTasks.get(id) ?? null),
        update: jest.fn(async ({ where: { id }, data }: any) => {
          const task = state.activityTasks.get(id);
          if (!task) return null;
          const updated = { ...task, ...data };
          state.activityTasks.set(id, updated);
          return updated;
        }),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CompaniesController, ActivitiesController, ActivityTasksController],
      providers: [
        CompaniesService,
        ActivitiesService,
        ActivityTasksService,
        AuthGuard,
        PermissionGuard,
        {
          provide: AuthService,
          useValue: {
            getSessionUser: jest.fn(() => 'user-1'),
            clearSession: jest.fn(),
            buildSessionCookie: jest.fn(),
            getFrontendRedirectUrl: jest.fn(),
            authenticateGoogleUser: jest.fn(),
            createSessionToken: jest.fn(),
            normalizeEmail: jest.fn(),
          },
        },
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use((req: any, _res: any, next: () => void) => {
      if (!req.headers.cookie) {
        req.headers.cookie = 'app_session=test-session';
      }
      next();
    });
    await app.init();
  });

  it('creates an activity task and lists it under the activity', async () => {
    const companyRes = await request(app.getHttpServer())
      .post('/companies')
      .send({ name: 'Bravo' })
      .expect(201);

    const companyId = companyRes.body.id;

    const activityRes = await request(app.getHttpServer())
      .post(`/companies/${companyId}/activities`)
      .send({
        name: 'Exercise',        type: 'EMPLOYMENT',        startDate: '2026-01-01',
        endDate: '2026-01-02',
      })
      .expect(201);

    const taskRes = await request(app.getHttpServer())
      .post(`/activities/${activityRes.body.id}/tasks`)
      .send({ name: 'Prepare gear' })
      .expect(201);

    expect(taskRes.body.name).toBe('Prepare gear');

    const tasksRes = await request(app.getHttpServer())
      .get(`/activities/${activityRes.body.id}/tasks`)
      .expect(200);

    expect(tasksRes.body).toHaveLength(1);
    expect(tasksRes.body[0].name).toBe('Prepare gear');
  });

  afterEach(async () => {
    await app.close();
  });
});
