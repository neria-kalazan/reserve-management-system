import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { CompaniesController } from '../src/modules/companies/companies.controller';
import { CompaniesService } from '../src/modules/companies/companies.service';
import { CompanyDashboardController } from '../src/modules/company-dashboard/company-dashboard.controller';
import { CompanyDashboardService } from '../src/modules/company-dashboard/company-dashboard.service';
import { ActivityTasksController } from '../src/modules/activity-tasks/activity-tasks.controller';
import { ActivityTasksService } from '../src/modules/activity-tasks/activity-tasks.service';
import { ActivitiesController } from '../src/modules/activities/activities.controller';
import { ActivitiesService } from '../src/modules/activities/activities.service';
import { TaskInstancesController } from '../src/modules/task-instances/task-instances.controller';
import { TaskInstancesService } from '../src/modules/task-instances/task-instances.service';
import { AssignmentsController } from '../src/modules/assignments/assignments.controller';
import { AssignmentsService } from '../src/modules/assignments/assignments.service';
import { TaskValidationService } from '../src/modules/task-instances/task-validation.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Company dashboard e2e', () => {
  let app: INestApplication<App>;
  let prismaMock: any;

  beforeEach(async () => {
    const state = {
      companies: new Map<string, any>(),
      activities: new Map<string, any>(),
      activityTasks: new Map<string, any>(),
      taskInstances: new Map<string, any>(),
      users: new Map<string, any>(),
      assignments: new Map<string, any>(),
      activityUserStatuses: new Map<string, any>(),
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
        findMany: jest.fn(async ({ where }: any) => Array.from(state.activities.values()).filter((activity) => activity.companyId === where.companyId && activity.status === where.status)),
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
          const instance = { id: randomUUID(), activityTaskId: data.activityTaskId, title: data.title, startTime: data.startTime, endTime: data.endTime, createdAt: new Date(), updatedAt: new Date() };
          state.taskInstances.set(instance.id, instance);
          return instance;
        }),
        findMany: jest.fn(async () => Array.from(state.taskInstances.values())),
      },
      user: {
        create: jest.fn(async ({ data }: any) => {
          const user = { id: randomUUID(), companyId: data.companyId, unitId: data.unitId, firstName: data.firstName, lastName: data.lastName, phone: data.phone ?? null, email: data.email ?? null, personalNumber: data.personalNumber ?? null, isActive: data.isActive ?? true };
          state.users.set(user.id, user);
          return user;
        }),
        count: jest.fn(async ({ where }: any) => Array.from(state.users.values()).filter((user) => user.companyId === where.companyId && user.isActive === where.isActive).length),
        findUnique: jest.fn(async ({ where: { id } }: any) => state.users.get(id) ?? null),
      },
      activityUserStatus: {
        findMany: jest.fn(async ({ where }: any) => Array.from(state.activityUserStatuses.values()).filter((record) => record.activityId === where.activityId).map((record) => ({ ...record }))),
        groupBy: jest.fn(async () => []),
      },
      assignment: {
        findMany: jest.fn(async ({ where }: any) => Array.from(state.assignments.values()).filter((assignment) => assignment.taskInstanceId === where.taskInstanceId || (where.taskInstance && where.taskInstance.activityTask && where.taskInstance.activityTask.activityId === undefined))),
        create: jest.fn(async ({ data }: any) => {
          const assignment = { id: randomUUID(), taskInstanceId: data.taskInstanceId, userId: data.userId, createdBy: data.createdBy ?? null, createdAt: new Date(), updatedAt: new Date() };
          state.assignments.set(assignment.id, assignment);
          return assignment;
        }),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CompaniesController, ActivitiesController, ActivityTasksController, TaskInstancesController, AssignmentsController, CompanyDashboardController],
      providers: [
        CompaniesService,
        ActivitiesService,
        ActivityTasksService,
        TaskInstancesService,
        AssignmentsService,
        CompanyDashboardService,
        {
          provide: TaskValidationService,
          useValue: {
            validate: jest.fn().mockResolvedValue({ requiredErrors: [], warnings: [], summary: { isValid: true } }),
          },
        },
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('returns the dashboard payload for an active company activity', async () => {
    const companyRes = await request(app.getHttpServer()).post('/companies').send({ name: 'Dashboard Co' }).expect(201);
    const companyId = companyRes.body.id;

    const activityRes = await request(app.getHttpServer()).post(`/companies/${companyId}/activities`).send({ name: 'Ops', startDate: '2026-01-01', endDate: '2026-01-03', status: 'ACTIVE' }).expect(201);
    const activityId = activityRes.body.id;

    const activityTaskRes = await request(app.getHttpServer()).post(`/activities/${activityId}/tasks`).send({ name: 'Setup' }).expect(201);
    const activityTaskId = activityTaskRes.body.id;

    await request(app.getHttpServer()).post(`/activity-tasks/${activityTaskId}/task-instances`).send({ title: 'Morning shift', startTime: '2026-01-01T09:00:00.000Z', endTime: '2026-01-01T17:00:00.000Z' }).expect(201);

    const dashboardRes = await request(app.getHttpServer()).get(`/companies/${companyId}/dashboard`).expect(200);
    expect(dashboardRes.body.activeActivity).toEqual(expect.objectContaining({ id: activityId, name: 'Ops' }));
    expect(dashboardRes.body.tasksSummary.totalTaskInstances).toBe(1);
  });

  afterEach(async () => {
    await app.close();
  });
});
