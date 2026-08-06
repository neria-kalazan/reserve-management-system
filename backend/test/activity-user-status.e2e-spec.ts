import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { ActivityUserStatusController } from '../src/modules/activity-user-status/activity-user-status.controller';
import { ActivityUserStatusService } from '../src/modules/activity-user-status/activity-user-status.service';
import { ActivitiesController } from '../src/modules/activities/activities.controller';
import { ActivitiesService } from '../src/modules/activities/activities.service';
import { CompaniesController } from '../src/modules/companies/companies.controller';
import { CompaniesService } from '../src/modules/companies/companies.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Activity user status e2e', () => {
  let app: INestApplication<App>;
  let prismaMock: any;

  beforeEach(async () => {
    const state = {
      companies: new Map<string, any>(),
      activities: new Map<string, any>(),
      users: new Map<string, any>(),
      activityUserStatuses: new Map<string, any>(),
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
      },
      user: {
        create: jest.fn(async ({ data }: any) => {
          const user = {
            id: randomUUID(),
            companyId: data.companyId,
            unitId: data.unitId,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            email: data.email ?? null,
            personalNumber: data.personalNumber,
            isActive: data.isActive ?? true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          state.users.set(user.id, user);
          return user;
        }),
        findUnique: jest.fn(async ({ where: { id } }: any) => state.users.get(id) ?? null),
      },
      activityUserStatus: {
        create: jest.fn(async ({ data }: any) => {
          const user = state.users.get(data.userId);
          const record = {
            id: randomUUID(),
            activityId: data.activityId,
            userId: data.userId,
            date: data.date,
            status: data.status,
            createdAt: new Date(),
            updatedAt: new Date(),
            user: user
              ? {
                  id: user.id,
                  firstName: user.firstName,
                  lastName: user.lastName,
                  phone: user.phone,
                  email: user.email,
                  personalNumber: user.personalNumber,
                  isActive: user.isActive,
                }
              : null,
          };
          state.activityUserStatuses.set(record.id, record);
          return record;
        }),
        findMany: jest.fn(async ({ where: { activityId }, select }: any) => {
          const records = Array.from(state.activityUserStatuses.values()).filter(
            (record) => record.activityId === activityId,
          );

          if (!select) {
            return records;
          }

          return records.map((record) => {
            const result: any = {};

            for (const key of Object.keys(select)) {
              if (key === 'user') {
                result.user = record.user;
              } else {
                result[key] = record[key];
              }
            }

            return result;
          });
        }),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CompaniesController, ActivitiesController, ActivityUserStatusController],
      providers: [
        CompaniesService,
        ActivitiesService,
        ActivityUserStatusService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('returns availability records for an activity', async () => {
    const companyRes = await request(app.getHttpServer())
      .post('/companies')
      .send({ name: 'Delta' })
      .expect(201);

    const companyId = companyRes.body.id;

    const activityRes = await request(app.getHttpServer())
      .post(`/companies/${companyId}/activities`)
      .send({
        name: 'Reserve drill',
        startDate: '2026-01-01',
        endDate: '2026-01-05',
      })
      .expect(201);

    const activityId = activityRes.body.id;

    const user = await prismaMock.user.create({
      data: {
        companyId,
        unitId: randomUUID(),
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '0501111111',
        email: 'jane@example.com',
        personalNumber: '67890',
      },
    });

    await prismaMock.activityUserStatus.create({
      data: {
        activityId,
        userId: user.id,
        date: new Date('2026-01-01'),
        status: 'ACTIVE',
      },
    });

    const availabilityRes = await request(app.getHttpServer())
      .get(`/activities/${activityId}/availability`)
      .expect(200);

    expect(availabilityRes.body).toHaveLength(1);
    expect(availabilityRes.body[0].status).toBe('ACTIVE');
    expect(availabilityRes.body[0].user.firstName).toBe('Jane');
    expect(availabilityRes.body[0].user.lastName).toBe('Smith');
  });

  it('returns 404 when activity does not exist', async () => {
    await request(app.getHttpServer())
      .get(`/activities/${randomUUID()}/availability`)
      .expect(404);
  });

  afterEach(async () => {
    await app.close();
  });
});
