import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { TaskInstancesController } from '../src/modules/task-instances/task-instances.controller';
import { TaskInstancesService } from '../src/modules/task-instances/task-instances.service';
import { TaskValidationController } from '../src/modules/task-instances/task-validation.controller';
import { TaskValidationService } from '../src/modules/task-instances/task-validation.service';
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

describe('Task validation e2e', () => {
  let app: INestApplication<App>;
  let prismaMock: any;

  beforeEach(async () => {
    const state = {
      companies: new Map<string, any>(),
      activities: new Map<string, any>(),
      activityTasks: new Map<string, any>(),
      taskInstances: new Map<string, any>(),
      assignments: new Map<string, any>(),
      activityTaskRequirements: new Map<string, any>(),
      activityUserStatuses: new Map<string, any>(),
      users: new Map<string, any>(),
    };

    prismaMock = {
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
      taskInstance: {
        create: jest.fn(async ({ data }: any) => {
          const activityTask = state.activityTasks.get(data.activityTaskId);
          const instance = {
            id: randomUUID(),
            activityTaskId: data.activityTaskId,
            title: data.title,
            startTime: data.startTime,
            endTime: data.endTime,
            activityTask: activityTask ? { id: activityTask.id, activity: { id: activityTask.activityId } } : null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          state.taskInstances.set(instance.id, instance);
          return instance;
        }),
        findUnique: jest.fn(async ({ where: { id } }: any) => state.taskInstances.get(id) ?? null),
      },
      assignment: {
        findMany: jest.fn(async ({ where: { taskInstanceId } }: any) => Array.from(state.assignments.values()).filter((assignment) => assignment.taskInstanceId === taskInstanceId)),
      },
      activityTaskManpowerRequirement: {
        findUnique: jest.fn(async ({ where: { activityTaskId } }: any) => state.activityTaskRequirements.get(`manpower:${activityTaskId}`) ?? null),
      },
      activityTaskRoleRequirement: {
        findMany: jest.fn(async ({ where: { activityTaskId } }: any) => Array.from(state.activityTaskRequirements.values()).filter((requirement) => requirement.activityTaskId === activityTaskId && requirement.type === 'role')),
      },
      activityTaskQualificationRequirement: {
        findMany: jest.fn(async ({ where: { activityTaskId } }: any) => Array.from(state.activityTaskRequirements.values()).filter((requirement) => requirement.activityTaskId === activityTaskId && requirement.type === 'qualification')),
      },
      activityUserStatus: {
        findMany: jest.fn(async ({ where: { activityId, date } }: any) => Array.from(state.activityUserStatuses.values()).filter((status) => status.activityId === activityId && status.date.getTime() === date.getTime())),
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
        findMany: jest.fn(async ({ where: { id: { in: ids } } }: any) => Array.from(state.users.values()).filter((user) => ids.includes(user.id))),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CompaniesController, ActivitiesController, ActivityTasksController, TaskInstancesController, TaskValidationController],
      providers: [CompaniesService, ActivitiesService, ActivityTasksService, TaskInstancesService, TaskValidationService, AuthGuard, PermissionGuard, { provide: AuthService, useValue: { getSessionUser: jest.fn(() => 'user-1'), clearSession: jest.fn(), buildSessionCookie: jest.fn(), getFrontendRedirectUrl: jest.fn(), authenticateGoogleUser: jest.fn(), createSessionToken: jest.fn(), normalizeEmail: jest.fn() } }, { provide: PrismaService, useValue: prismaMock }],
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

  it('returns validation details for a task instance', async () => {
    const companyRes = await request(app.getHttpServer()).post('/companies').send({ name: 'Epsilon' }).expect(201);
    const companyId = companyRes.body.id;

    const activityRes = await request(app.getHttpServer()).post(`/companies/${companyId}/activities`).send({ name: 'Ops', type: 'TRAINING', startDate: '2026-01-01', endDate: '2026-01-02' }).expect(201);
    const activityId = activityRes.body.id;

    const taskRes = await request(app.getHttpServer()).post(`/activities/${activityId}/tasks`).send({ name: 'Setup' }).expect(201);
    const activityTaskId = taskRes.body.id;

    const taskInstanceRes = await request(app.getHttpServer()).post(`/activity-tasks/${activityTaskId}/task-instances`).send({ title: 'Morning shift', startTime: '2026-01-01T09:00:00.000Z', endTime: '2026-01-01T17:00:00.000Z' }).expect(201);
    const taskInstanceId = taskInstanceRes.body.id;

    await request(app.getHttpServer()).get(`/task-instances/${taskInstanceId}/validation`).expect(200);
  });

  afterEach(async () => {
    await app.close();
  });
});
