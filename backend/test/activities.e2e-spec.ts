import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { ActivitiesController } from '../src/modules/activities/activities.controller';
import { ActivitiesService } from '../src/modules/activities/activities.service';
import { CompaniesController } from '../src/modules/companies/companies.controller';
import { CompaniesService } from '../src/modules/companies/companies.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Activities e2e', () => {
  let app: INestApplication<App>;
  let prismaMock: any;

  beforeEach(async () => {
    const state = {
      companies: new Map<string, any>(),
      activities: new Map<string, any>(),
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
        findMany: jest.fn(async ({ where: { companyId } }: any) => Array.from(state.activities.values()).filter((activity) => activity.companyId === companyId)),
        findUnique: jest.fn(async ({ where: { id } }: any) => state.activities.get(id) ?? null),
        update: jest.fn(async ({ where: { id }, data }: any) => {
          const activity = state.activities.get(id);
          if (!activity) return null;
          const updated = { ...activity, ...data };
          state.activities.set(id, updated);
          return updated;
        }),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CompaniesController, ActivitiesController],
      providers: [CompaniesService, ActivitiesService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('creates an activity for a company and retrieves it', async () => {
    const companyRes = await request(app.getHttpServer())
      .post('/companies')
      .send({ name: 'Alpha' })
      .expect(201);

    const companyId = companyRes.body.id;

    const createRes = await request(app.getHttpServer())
      .post(`/companies/${companyId}/activities`)
      .send({
        name: 'Training',
        startDate: '2026-01-01',
        endDate: '2026-01-02',
      })
      .expect(201);

    expect(createRes.body.status).toBe('DRAFT');

    const listRes = await request(app.getHttpServer())
      .get(`/companies/${companyId}/activities`)
      .expect(200);

    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].name).toBe('Training');
  });

  afterEach(async () => {
    await app.close();
  });
});
