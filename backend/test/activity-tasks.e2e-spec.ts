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
      providers: [CompaniesService, ActivitiesService, ActivityTasksService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    app = moduleFixture.createNestApplication();
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
        name: 'Exercise',
        startDate: '2026-01-01',
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
