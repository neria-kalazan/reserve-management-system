import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AssignmentsController } from '../src/modules/assignments/assignments.controller';
import { AssignmentsService } from '../src/modules/assignments/assignments.service';
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
import { PrismaService } from '../src/prisma/prisma.service';

describe('Assignments e2e', () => {
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
      assignments: new Map<string, any>(),
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
        findUnique: jest.fn(async ({ where: { id } }: any) => {
          const task = state.activityTasks.get(id);
          if (!task) return null;
          const activity = state.activities.get(task.activityId);
          return {
            ...task,
            activity: activity ? { companyId: activity.companyId } : null,
          };
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
      },
      unit: {
        create: jest.fn(async ({ data }: any) => {
          const unit = { id: randomUUID(), companyId: data.companyId, name: data.name, description: data.description ?? null, displayOrder: data.displayOrder ?? 0, createdAt: new Date(), updatedAt: new Date() };
          state.units.set(unit.id, unit);
          return unit;
        }),
        findUnique: jest.fn(async ({ where: { id } }: any) => state.units.get(id) ?? null),
        findMany: jest.fn(async ({ where: { companyId } }: any) => Array.from(state.units.values()).filter((unit) => unit.companyId === companyId)),
      },
      user: {
        create: jest.fn(async ({ data }: any) => {
          const user = { id: randomUUID(), companyId: data.companyId, unitId: data.unitId, firstName: data.firstName, lastName: data.lastName, phone: data.phone ?? null, email: data.email ?? null, personalNumber: data.personalNumber ?? null, isActive: data.isActive ?? true };
          state.users.set(user.id, user);
          return user;
        }),
        findUnique: jest.fn(async ({ where: { id } }: any) => state.users.get(id) ?? null),
        findMany: jest.fn(async ({ where: { companyId } }: any) => Array.from(state.users.values()).filter((user) => user.companyId === companyId)),
      },
      assignment: {
        create: jest.fn(async ({ data }: any) => {
          const assignment = { id: randomUUID(), taskInstanceId: data.taskInstanceId, userId: data.userId, createdBy: data.createdBy ?? null, createdAt: new Date(), updatedAt: new Date() };
          state.assignments.set(assignment.id, assignment);
          return assignment;
        }),
        findMany: jest.fn(async ({ where: { taskInstanceId } }: any) => Array.from(state.assignments.values()).filter((assignment) => assignment.taskInstanceId === taskInstanceId)),
        findUnique: jest.fn(async ({ where }: any) => {
          if (where?.taskInstanceId_userId) {
            return Array.from(state.assignments.values()).find((assignment) => assignment.taskInstanceId === where.taskInstanceId_userId.taskInstanceId && assignment.userId === where.taskInstanceId_userId.userId) ?? null;
          }

          return state.assignments.get(where.id) ?? null;
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
      providers: [CompaniesService, ActivitiesService, ActivityTasksService, TaskInstancesService, AssignmentsService, UnitsService, UsersService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('creates, lists, and deletes assignments', async () => {
    const companyRes = await request(app.getHttpServer()).post('/companies').send({ name: 'Theta' }).expect(201);
    const companyId = companyRes.body.id;

    const activityRes = await request(app.getHttpServer()).post(`/companies/${companyId}/activities`).send({ name: 'Ops', startDate: '2026-01-01', endDate: '2026-01-02' }).expect(201);
    const activityId = activityRes.body.id;

    const taskRes = await request(app.getHttpServer()).post(`/activities/${activityId}/tasks`).send({ name: 'Setup' }).expect(201);
    const activityTaskId = taskRes.body.id;

    const taskInstanceRes = await request(app.getHttpServer()).post(`/activity-tasks/${activityTaskId}/task-instances`).send({ title: 'Morning shift', startTime: '2026-01-01T09:00:00.000Z', endTime: '2026-01-01T17:00:00.000Z' }).expect(201);
    const taskInstanceId = taskInstanceRes.body.id;

    const unitRes = await request(app.getHttpServer()).post(`/companies/${companyId}/units`).send({ name: 'Ops', displayOrder: 1 }).expect(201);
    const unitId = unitRes.body.id;

    const userRes = await request(app.getHttpServer()).post(`/companies/${companyId}/users`).send({ firstName: 'Ada', lastName: 'Lovelace', phone: '+123456789', personalNumber: 'P-001', unitId, email: 'ada@example.com' }).expect(201);
    const userId = userRes.body.id;

    const createRes = await request(app.getHttpServer()).post(`/task-instances/${taskInstanceId}/assignments`).send({ userId }).expect(201);
    expect(createRes.body.userId).toBe(userId);

    const listRes = await request(app.getHttpServer()).get(`/task-instances/${taskInstanceId}/assignments`).expect(200);
    expect(listRes.body).toHaveLength(1);

    const deleteRes = await request(app.getHttpServer()).delete(`/assignments/${createRes.body.id}`).expect(200);
    expect(deleteRes.body.id).toBe(createRes.body.id);
  });

  afterEach(async () => {
    await app.close();
  });
});
