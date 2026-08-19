import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { TaskInstancesController } from '../src/modules/task-instances/task-instances.controller';
import { TaskInstancesService } from '../src/modules/task-instances/task-instances.service';
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

describe('Task instances e2e', () => {
  let app: INestApplication<App>;
  let prismaMock: any;

  beforeEach(async () => {
    const state = {
      companies: new Map<string, any>(),
      activities: new Map<string, any>(),
      activityTasks: new Map<string, any>(),
      taskInstances: new Map<string, any>(),
    };

    prismaMock = {
      userPermission: {
        findMany: jest.fn().mockResolvedValue([{ permission: { key: 'MANAGE_COMPANIES' } }]),
      },
      company: {
        create: jest.fn(async ({ data }: any) => {
          const company = { id: randomUUID(), name: data.name, status: data.status, ownerUserId: data.ownerUserId ?? null, createdAt: new Date(), updatedAt: new Date() };
          state.companies.set(company.id, company);
          return company;
        }),
        findUnique: jest.fn(async ({ where: { id } }: any) => state.companies.get(id) ?? null),
      },
      activity: {
        create: jest.fn(async ({ data }: any) => {
          const activity = { id: randomUUID(), companyId: data.companyId, name: data.name, startDate: new Date(data.startDate), endDate: new Date(data.endDate), status: data.status, createdAt: new Date(), updatedAt: new Date() };
          state.activities.set(activity.id, activity);
          return activity;
        }),
        findUnique: jest.fn(async ({ where: { id } }: any) => state.activities.get(id) ?? null),
      },
      activityTask: {
        create: jest.fn(async ({ data }: any) => {
          const task = { id: randomUUID(), activityId: data.activityId, name: data.name, description: data.description ?? null, createdAt: new Date(), updatedAt: new Date() };
          state.activityTasks.set(task.id, task);
          return task;
        }),
        findUnique: jest.fn(async ({ where: { id } }: any) => state.activityTasks.get(id) ?? null),
      },
      user: {
        findUnique: jest.fn(async ({ where: { id } }: any) => {
          if (id === 'user-1') {
            return { id: 'user-1', email: 'test@example.com', firstName: 'Test', lastName: 'User', isActive: true };
          }
          return null;
        }),
      },
      taskInstance: {
        create: jest.fn(async ({ data }: any) => {
          const instance = { id: randomUUID(), activityTaskId: data.activityTaskId, title: data.title, startTime: data.startTime, endTime: data.endTime, createdAt: new Date(), updatedAt: new Date() };
          state.taskInstances.set(instance.id, instance);
          return instance;
        }),
        findMany: jest.fn(async ({ where: { activityTaskId } }: any) => Array.from(state.taskInstances.values()).filter((instance) => instance.activityTaskId === activityTaskId)),
        findUnique: jest.fn(async ({ where: { id } }: any) => state.taskInstances.get(id) ?? null),
        update: jest.fn(async ({ where: { id }, data }: any) => {
          const instance = state.taskInstances.get(id);
          if (!instance) return null;
          const updated = { ...instance, ...data };
          state.taskInstances.set(id, updated);
          return updated;
        }),
        delete: jest.fn(async ({ where: { id } }: any) => {
          const instance = state.taskInstances.get(id);
          state.taskInstances.delete(id);
          return instance;
        }),
      },
      $transaction: jest.fn(async (callback: any) => callback(prismaMock)),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CompaniesController, ActivitiesController, ActivityTasksController, TaskInstancesController],
      providers: [
        CompaniesService,
        ActivitiesService,
        ActivityTasksService,
        TaskInstancesService,
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

  it('creates, lists, retrieves, updates, and deletes task instances', async () => {
    const companyRes = await request(app.getHttpServer()).post('/companies').send({ name: 'Gamma' }).expect(201);
    const companyId = companyRes.body.id;

    const activityRes = await request(app.getHttpServer()).post(`/companies/${companyId}/activities`).send({ name: 'Ops', type: 'EMPLOYMENT', startDate: '2026-01-01', endDate: '2026-01-02' }).expect(201);
    const activityId = activityRes.body.id;

    const taskRes = await request(app.getHttpServer()).post(`/activities/${activityId}/tasks`).send({ name: 'Setup' }).expect(201);
    const activityTaskId = taskRes.body.id;

    const createRes = await request(app.getHttpServer()).post(`/activity-tasks/${activityTaskId}/task-instances`).send({ title: 'Morning shift', startTime: '2026-01-01T09:00:00.000Z', endTime: '2026-01-01T17:00:00.000Z' }).expect(201);
    const taskInstanceId = createRes.body.id;

    const listRes = await request(app.getHttpServer()).get(`/activity-tasks/${activityTaskId}/task-instances`).expect(200);
    expect(listRes.body).toHaveLength(1);

    const getRes = await request(app.getHttpServer()).get(`/task-instances/${taskInstanceId}`).expect(200);
    expect(getRes.body.title).toBe('Morning shift');

    const updateRes = await request(app.getHttpServer()).patch(`/task-instances/${taskInstanceId}`).send({ title: 'Evening shift' }).expect(200);
    expect(updateRes.body.title).toBe('Evening shift');

    const deleteRes = await request(app.getHttpServer()).delete(`/task-instances/${taskInstanceId}`).expect(200);
    expect(deleteRes.body.id).toBe(taskInstanceId);
  });

  it('rejects invalid date ranges', async () => {
    const companyRes = await request(app.getHttpServer()).post('/companies').send({ name: 'Delta' }).expect(201);
    const companyId = companyRes.body.id;

    const activityRes = await request(app.getHttpServer()).post(`/companies/${companyId}/activities`).send({ name: 'Ops', type: 'TRAINING', startDate: '2026-01-01', endDate: '2026-01-02' }).expect(201);
    const activityId = activityRes.body.id;

    const taskRes = await request(app.getHttpServer()).post(`/activities/${activityId}/tasks`).send({ name: 'Setup' }).expect(201);
    const activityTaskId = taskRes.body.id;

    await request(app.getHttpServer()).post(`/activity-tasks/${activityTaskId}/task-instances`).send({ title: 'Bad interval', startTime: '2026-01-01T17:00:00.000Z', endTime: '2026-01-01T09:00:00.000Z' }).expect(400);
  });

  it('bulk creates task instances for a date range', async () => {
    const companyRes = await request(app.getHttpServer()).post('/companies').send({ name: 'Epsilon' }).expect(201);
    const companyId = companyRes.body.id;

    const activityRes = await request(app.getHttpServer()).post(`/companies/${companyId}/activities`).send({ name: 'Ops', type: 'TRAINING', startDate: '2026-08-01', endDate: '2026-08-03' }).expect(201);
    const activityId = activityRes.body.id;

    const taskRes = await request(app.getHttpServer()).post(`/activities/${activityId}/tasks`).send({ name: 'Patrol' }).expect(201);
    const activityTaskId = taskRes.body.id;

    const bulkRes = await request(app.getHttpServer())
      .post(`/activity-tasks/${activityTaskId}/task-instances/bulk`)
      .send({ startDate: '2026-08-01', endDate: '2026-08-03', startTime: '06:00', endTime: '14:00' })
      .expect(201);

    expect(bulkRes.body.createdCount).toBe(3);
    expect(bulkRes.body.createdTaskInstances).toHaveLength(3);
    expect(bulkRes.body.createdTaskInstances[0].title).toBe('Patrol');
  });

  afterEach(async () => {
    await app.close();
  });
});
