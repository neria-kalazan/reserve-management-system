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
import { UnitsController } from '../src/modules/units/units.controller';
import { UnitsService } from '../src/modules/units/units.service';
import { UsersController } from '../src/modules/users/users.controller';
import { UsersService } from '../src/modules/users/users.service';
import { AssignmentsController } from '../src/modules/assignments/assignments.controller';
import { AssignmentsService } from '../src/modules/assignments/assignments.service';
import { TaskValidationService } from '../src/modules/task-instances/task-validation.service';
import { AuthService } from '../src/modules/auth/auth.service';
import { AuthGuard } from '../src/modules/auth/auth.guard';
import { PermissionGuard } from '../src/modules/auth/permission.guard';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Task instances available users e2e', () => {
  let app: INestApplication<App>;
  let prismaMock: any;

  beforeEach(async () => {
    const state = {
      companies: new Map<string, any>(),
      activities: new Map<string, any>(),
      activityTasks: new Map<string, any>(),
      taskInstances: new Map<string, any>(),
      units: new Map<string, any>(),
      users: new Map<string, any>(),
      activityUserStatuses: new Map<string, any>(),
      assignments: new Map<string, any>(),
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
        findUnique: jest.fn(async ({ where: { id } }: any) => {
          const task = state.activityTasks.get(id);
          if (!task) return null;
          const activity = state.activities.get(task.activityId);
          return { ...task, activity: activity ? { id: activity.id, companyId: activity.companyId } : null };
        }),
      },
      activityTaskRoleRequirement: {
        findMany: jest.fn(async () => []),
      },
      activityTaskQualificationRequirement: {
        findMany: jest.fn(async () => []),
      },
      taskInstance: {
        create: jest.fn(async ({ data }: any) => {
          const instance = { id: randomUUID(), activityTaskId: data.activityTaskId, title: data.title, startTime: data.startTime, endTime: data.endTime, createdAt: new Date(), updatedAt: new Date() };
          state.taskInstances.set(instance.id, instance);
          return instance;
        }),
        findUnique: jest.fn(async ({ where: { id } }: any) => {
          const instance = state.taskInstances.get(id);
          if (!instance) return null;
          const activityTask = state.activityTasks.get(instance.activityTaskId);
          const activity = activityTask ? state.activities.get(activityTask.activityId) : null;
          return {
            ...instance,
            activityTask: activityTask ? { activity: activity ? { id: activity.id, companyId: activity.companyId } : null } : null,
          };
        }),
      },
      unit: {
        create: jest.fn(async ({ data }: any) => {
          const unit = { id: randomUUID(), companyId: data.companyId, name: data.name, description: data.description ?? null, displayOrder: data.displayOrder ?? 0, createdAt: new Date(), updatedAt: new Date() };
          state.units.set(unit.id, unit);
          return unit;
        }),
        findUnique: jest.fn(async ({ where: { id } }: any) => state.units.get(id) ?? null),
      },
      user: {
        create: jest.fn(async ({ data }: any) => {
          const user = { id: randomUUID(), companyId: data.companyId, unitId: data.unitId, firstName: data.firstName, lastName: data.lastName, phone: data.phone ?? null, email: data.email ?? null, personalNumber: data.personalNumber ?? null, isActive: data.isActive ?? true };
          state.users.set(user.id, user);
          return user;
        }),
        findUnique: jest.fn(async ({ where: { id } }: any) => {
          if (id === 'user-1') {
            return { id: 'user-1', email: 'test@example.com', firstName: 'Test', lastName: 'User', isActive: true };
          }
          return state.users.get(id) ?? null;
        }),
        findMany: jest.fn(async ({ where }: any) => {
          const ids = where?.id?.in ?? Array.from(state.users.keys());
          return Array.from(state.users.values())
            .filter((user) => ids.includes(user.id))
            .map((user) => ({
              ...user,
              userRoles: [],
              userQualifications: [],
            }));
        }),
      },
      activityUserStatus: {
        findMany: jest.fn(async ({ where }: any) => Array.from(state.activityUserStatuses.values()).filter((record) => {
          const matchesActivity = record.activityId === where.activityId;
          const matchesStatus = where.status ? record.status === where.status : true;
          const recordDate = new Date(record.date).toISOString().slice(0, 10);
          const whereDate = new Date(where.date).toISOString().slice(0, 10);
          const matchesDate = recordDate === whereDate;
          return matchesActivity && matchesDate && matchesStatus;
        }).map((record) => ({
          ...record,
          user: state.users.get(record.userId) ?? null,
        }))),
        create: jest.fn(async ({ data }: any) => {
          const record = { id: randomUUID(), activityId: data.activityId, userId: data.userId, date: data.date, status: data.status, availability: data.availability ?? 'ALL_DAY', createdAt: new Date(), updatedAt: new Date() };
          state.activityUserStatuses.set(record.id, record);
          return {
            ...record,
            user: state.users.get(record.userId) ?? null,
          };
        }),
      },
      assignment: {
        findMany: jest.fn(async ({ where: { taskInstanceId } }: any) => Array.from(state.assignments.values()).filter((assignment) => assignment.taskInstanceId === taskInstanceId)),
        findUnique: jest.fn(async ({ where }: any) => {
          if (where?.taskInstanceId_userId) {
            return Array.from(state.assignments.values()).find((assignment) => assignment.taskInstanceId === where.taskInstanceId_userId.taskInstanceId && assignment.userId === where.taskInstanceId_userId.userId) ?? null;
          }

          return state.assignments.get(where.id) ?? null;
        }),
        create: jest.fn(async ({ data }: any) => {
          const assignment = { id: randomUUID(), taskInstanceId: data.taskInstanceId, userId: data.userId, createdBy: data.createdBy ?? null, createdAt: new Date(), updatedAt: new Date() };
          state.assignments.set(assignment.id, assignment);
          return assignment;
        }),
        delete: jest.fn(async ({ where: { id } }: any) => {
          const assignment = state.assignments.get(id);
          state.assignments.delete(id);
          return assignment;
        }),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CompaniesController, ActivitiesController, ActivityTasksController, TaskInstancesController, AssignmentsController, UnitsController, UsersController],
      providers: [CompaniesService, ActivitiesService, ActivityTasksService, TaskInstancesService, AssignmentsService, UnitsService, UsersService, TaskValidationService, AuthGuard, PermissionGuard, { provide: AuthService, useValue: { getSessionUser: jest.fn(() => 'user-1'), clearSession: jest.fn(), buildSessionCookie: jest.fn(), getFrontendRedirectUrl: jest.fn(), authenticateGoogleUser: jest.fn(), createSessionToken: jest.fn(), normalizeEmail: jest.fn() } }, { provide: PrismaService, useValue: prismaMock }],
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

  it('returns only active unassigned users for the task instance date', async () => {
    const companyRes = await request(app.getHttpServer()).post('/companies').send({ name: 'Omega' }).expect(201);
    const companyId = companyRes.body.id;

    const activityRes = await request(app.getHttpServer()).post(`/companies/${companyId}/activities`).send({ name: 'Ops', startDate: '2026-01-01', endDate: '2026-01-01' }).expect(201);
    const activityId = activityRes.body.id;

    const unitRes = await request(app.getHttpServer()).post(`/companies/${companyId}/units`).send({ name: 'Ops', displayOrder: 1 }).expect(201);
    const unitId = unitRes.body.id;

    const activeUserRes = await request(app.getHttpServer()).post(`/companies/${companyId}/users`).send({ firstName: 'Ada', lastName: 'Lovelace', phone: '+123', personalNumber: 'P-1', unitId, email: 'ada@example.com' }).expect(201);
    const activeUserTwoRes = await request(app.getHttpServer()).post(`/companies/${companyId}/users`).send({ firstName: 'Grace', lastName: 'Hopper', phone: '+124', personalNumber: 'P-2', unitId, email: 'grace@example.com' }).expect(201);
    const holidayUserRes = await request(app.getHttpServer()).post(`/companies/${companyId}/users`).send({ firstName: 'Linus', lastName: 'Torvalds', phone: '+125', personalNumber: 'P-3', unitId, email: 'linus@example.com' }).expect(201);
    const sickUserRes = await request(app.getHttpServer()).post(`/companies/${companyId}/users`).send({ firstName: 'Katherine', lastName: 'Johnson', phone: '+126', personalNumber: 'P-4', unitId, email: 'katherine@example.com' }).expect(201);
    const releasedUserRes = await request(app.getHttpServer()).post(`/companies/${companyId}/users`).send({ firstName: 'Marie', lastName: 'Curie', phone: '+127', personalNumber: 'P-5', unitId, email: 'marie@example.com' }).expect(201);

    const taskRes = await request(app.getHttpServer()).post(`/activities/${activityId}/tasks`).send({ name: 'Setup' }).expect(201);
    const activityTaskId = taskRes.body.id;

    const taskInstanceRes = await request(app.getHttpServer()).post(`/activity-tasks/${activityTaskId}/task-instances`).send({ title: 'Morning shift', startTime: '2026-01-01T09:00:00.000Z', endTime: '2026-01-01T17:00:00.000Z' }).expect(201);
    const taskInstanceId = taskInstanceRes.body.id;

    const availabilityDate = new Date('2026-01-01T00:00:00.000Z');
    await prismaMock.activityUserStatus.create({ data: { activityId, userId: activeUserRes.body.id, date: availabilityDate, status: 'ACTIVE', availability: 'ALL_DAY' } });
    await prismaMock.activityUserStatus.create({ data: { activityId, userId: activeUserTwoRes.body.id, date: availabilityDate, status: 'ACTIVE', availability: 'MORNING' } });
    await prismaMock.activityUserStatus.create({ data: { activityId, userId: holidayUserRes.body.id, date: availabilityDate, status: 'HOLIDAY', availability: 'ALL_DAY' } });
    await prismaMock.activityUserStatus.create({ data: { activityId, userId: sickUserRes.body.id, date: availabilityDate, status: 'SICK', availability: 'ALL_DAY' } });
    await prismaMock.activityUserStatus.create({ data: { activityId, userId: releasedUserRes.body.id, date: availabilityDate, status: 'RELEASED', availability: 'ALL_DAY' } });

    await prismaMock.assignment.create({ data: { taskInstanceId, userId: activeUserRes.body.id } });

    const availableRes = await request(app.getHttpServer()).get(`/task-instances/${taskInstanceId}/available-users`).expect(200);
    expect(availableRes.body).toHaveLength(1);
    expect(availableRes.body[0].id).toBe(activeUserTwoRes.body.id);
  });

  it('filters unavailable users by scheduling availability for evening tasks', async () => {
    const companyRes = await request(app.getHttpServer()).post('/companies').send({ name: 'Omega 2' }).expect(201);
    const companyId = companyRes.body.id;

    const activityRes = await request(app.getHttpServer()).post(`/companies/${companyId}/activities`).send({ name: 'Ops 2', startDate: '2026-01-01', endDate: '2026-01-01' }).expect(201);
    const activityId = activityRes.body.id;

    const unitRes = await request(app.getHttpServer()).post(`/companies/${companyId}/units`).send({ name: 'Ops 2', displayOrder: 1 }).expect(201);
    const unitId = unitRes.body.id;

    const morningUserRes = await request(app.getHttpServer()).post(`/companies/${companyId}/users`).send({ firstName: 'Mina', lastName: 'Morning', phone: '+128', personalNumber: 'P-6', unitId, email: 'mina@example.com' }).expect(201);
    const eveningUserRes = await request(app.getHttpServer()).post(`/companies/${companyId}/users`).send({ firstName: 'Eli', lastName: 'Evening', phone: '+129', personalNumber: 'P-7', unitId, email: 'eli@example.com' }).expect(201);

    const taskRes = await request(app.getHttpServer()).post(`/activities/${activityId}/tasks`).send({ name: 'Setup 2' }).expect(201);
    const activityTaskId = taskRes.body.id;

    const taskInstanceRes = await request(app.getHttpServer()).post(`/activity-tasks/${activityTaskId}/task-instances`).send({ title: 'Evening shift', startTime: '2026-01-01T15:00:00.000Z', endTime: '2026-01-01T23:00:00.000Z' }).expect(201);
    const taskInstanceId = taskInstanceRes.body.id;

    const availabilityDate = new Date('2026-01-01T00:00:00.000Z');
    await prismaMock.activityUserStatus.create({ data: { activityId, userId: morningUserRes.body.id, date: availabilityDate, status: 'ACTIVE', availability: 'MORNING' } });
    await prismaMock.activityUserStatus.create({ data: { activityId, userId: eveningUserRes.body.id, date: availabilityDate, status: 'ACTIVE', availability: 'EVENING' } });

    const availableRes = await request(app.getHttpServer()).get(`/task-instances/${taskInstanceId}/available-users`).expect(200);
    expect(availableRes.body).toHaveLength(1);
    expect(availableRes.body[0].id).toBe(eveningUserRes.body.id);
  });

  afterEach(async () => {
    await app.close();
  });
});
