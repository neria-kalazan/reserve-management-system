import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { ActivitiesController } from '../src/modules/activities/activities.controller';
import { ActivitiesService } from '../src/modules/activities/activities.service';
import { CompaniesController } from '../src/modules/companies/companies.controller';
import { CompaniesService } from '../src/modules/companies/companies.service';
import { ActivityUserStatusController } from '../src/modules/activity-user-status/activity-user-status.controller';
import { ActivityUserStatusService } from '../src/modules/activity-user-status/activity-user-status.service';
import { UsersController } from '../src/modules/users/users.controller';
import { UsersService } from '../src/modules/users/users.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Activities e2e', () => {
  let app: INestApplication<App>;
  let prismaMock: any;

  beforeEach(async () => {
    const state = {
      companies: new Map<string, any>(),
      activities: new Map<string, any>(),
      users: new Map<string, any>(),
      units: new Map<string, any>(),
      availability: new Map<string, any>(),
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
      unit: {
        create: jest.fn(async ({ data }: any) => {
          const unit = {
            id: data.id ?? randomUUID(),
            companyId: data.companyId,
            name: data.name,
            description: data.description ?? null,
            displayOrder: data.displayOrder ?? 0,
          };
          state.units.set(unit.id, unit);
          return unit;
        }),
        findUnique: jest.fn(async ({ where: { id } }: any) => state.units.get(id) ?? null),
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
      user: {
        findMany: jest.fn(async ({ where }: any) => Array.from(state.users.values()).filter((user) => user.companyId === where.companyId && user.isActive === where.isActive)),
        create: jest.fn(async ({ data }: any) => {
          const user = {
            id: randomUUID(),
            companyId: data.companyId,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            email: data.email ?? null,
            personalNumber: data.personalNumber,
            isActive: data.isActive ?? true,
          };
          state.users.set(user.id, user);
          return user;
        }),
      },
      activityUserStatus: {
        create: jest.fn(async ({ data }: any) => {
          const key = `${data.activityId}:${data.userId}:${data.date.toISOString()}`;
          if (state.availability.has(key)) {
            throw { code: 'P2002' };
          }
          const record = {
            id: randomUUID(),
            activityId: data.activityId,
            userId: data.userId,
            date: data.date,
            status: data.status,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          state.availability.set(key, record);
          return record;
        }),
        findMany: jest.fn(async ({ where }: any) => Array.from(state.availability.values()).filter((record) => record.activityId === where.activityId)),
      },
      $transaction: jest.fn(async (callback: any) => callback(prismaMock)),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CompaniesController, ActivitiesController, ActivityUserStatusController, UsersController],
      providers: [CompaniesService, ActivitiesService, ActivityUserStatusService, UsersService, { provide: PrismaService, useValue: prismaMock }],
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

  it('generates activity availability for active company users', async () => {
    const companyRes = await request(app.getHttpServer())
      .post('/companies')
      .send({ name: 'Beta' })
      .expect(201);

    const companyId = companyRes.body.id;

    await prismaMock.user.create({
      data: {
        companyId,
        unitId: '11111111-1111-1111-1111-111111111111',
        firstName: 'Test',
        lastName: 'User',
        phone: '0500000000',
        personalNumber: '100001',
        isActive: true,
      },
    });

    const activityRes = await request(app.getHttpServer())
      .post(`/companies/${companyId}/activities`)
      .send({
        name: 'Availability Test',
        startDate: '2026-01-01',
        endDate: '2026-01-02',
      })
      .expect(201);

    const generateRes = await request(app.getHttpServer())
      .post(`/activities/${activityRes.body.id}/availability/generate`)
      .expect(201);

    expect(generateRes.body).toHaveLength(2);
  });

  afterEach(async () => {
    await app.close();
  });
});
