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
import { AuthService } from '../src/modules/auth/auth.service';
import { AuthGuard } from '../src/modules/auth/auth.guard';
import { PermissionGuard } from '../src/modules/auth/permission.guard';
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
      availabilityById: new Map<string, any>(),
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
      userPermission: {
        findMany: jest.fn().mockResolvedValue([{ permission: { key: 'MANAGE_COMPANIES' } }]),
      },
      user: {
        findMany: jest.fn(async ({ where }: any) => {
          if (where?.id?.in) {
            return Array.from(state.users.values()).filter((user) => where.id.in.includes(user.id));
          }

          return Array.from(state.users.values()).filter((user) => {
            if (where?.companyId !== undefined && user.companyId !== where.companyId) {
              return false;
            }
            if (where?.isActive !== undefined && user.isActive !== where.isActive) {
              return false;
            }
            return true;
          });
        }),
        findUnique: jest.fn(async ({ where: { id } }: any) => {
          if (id === 'user-1') {
            return { id: 'user-1', email: 'test@example.com', firstName: 'Test', lastName: 'User', isActive: true };
          }
          return state.users.get(id) ?? null;
        }),
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
          const user = state.users.get(data.userId) ?? null;
          const record = {
            id: randomUUID(),
            activityId: data.activityId,
            userId: data.userId,
            date: data.date,
            status: data.status,
            availability: data.availability,
            createdAt: new Date(),
            updatedAt: new Date(),
            user,
          };
          state.availability.set(key, record);
          state.availabilityById.set(record.id, record);
          return record;
        }),
        findMany: jest.fn(async ({ where }: any) => {
          const records = Array.from(state.availabilityById.values()).filter((record: any) => record.activityId === where.activityId);
          return records.filter((record: any) => {
            if (where.userId && where.userId.in) {
              if (!where.userId.in.includes(record.userId)) {
                return false;
              }
            }
            if (where.date) {
              const date = new Date(record.date);
              const start = new Date(where.date.gte);
              const end = new Date(where.date.lte);
              if (date < start || date > end) {
                return false;
              }
            }
            return true;
          });
        }),
        findUnique: jest.fn(async ({ where: { id } }: any) => state.availabilityById.get(id) ?? null),
        update: jest.fn(async ({ where: { id }, data }: any) => {
          const record = state.availabilityById.get(id);
          if (!record) return null;
          const oldKey = `${record.activityId}:${record.userId}:${record.date.toISOString()}`;
          const updated = { ...record, ...data, updatedAt: new Date() };
          const newKey = `${updated.activityId}:${updated.userId}:${updated.date.toISOString()}`;
          state.availability.delete(oldKey);
          state.availability.set(newKey, updated);
          state.availabilityById.set(id, updated);
          return updated;
        }),
      },
      $transaction: jest.fn(async (callback: any) => callback(prismaMock)),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CompaniesController, ActivitiesController, ActivityUserStatusController, UsersController],
      providers: [
        CompaniesService,
        ActivitiesService,
        ActivityUserStatusService,
        UsersService,
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
        type: 'TRAINING',
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
        type: 'EMPLOYMENT',
        startDate: '2026-01-01',
        endDate: '2026-01-02',
      })
      .expect(201);

    const generateRes = await request(app.getHttpServer())
      .post(`/activities/${activityRes.body.id}/availability/generate`)
      .expect(201);

    expect(generateRes.body).toHaveLength(2);
  });

  it('updates a single availability record status', async () => {
    const companyRes = await request(app.getHttpServer())
      .post('/companies')
      .send({ name: 'Gamma' })
      .expect(201);

    const companyId = companyRes.body.id;

    await prismaMock.user.create({
      data: {
        companyId,
        unitId: '11111111-1111-1111-1111-111111111111',
        firstName: 'Test',
        lastName: 'User',
        phone: '0500000000',
        personalNumber: '100002',
        isActive: true,
      },
    });

    const activityRes = await request(app.getHttpServer())
      .post(`/companies/${companyId}/activities`)
      .send({
        name: 'Single Update Test',
        type: 'TRAINING_COURSE',
        startDate: '2026-01-01',
        endDate: '2026-01-01',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/activities/${activityRes.body.id}/availability/generate`)
      .expect(201);

    const records = await prismaMock.activityUserStatus.findMany({ where: { activityId: activityRes.body.id } });
    const recordId = records[0].id;

    const updateRes = await request(app.getHttpServer())
      .patch(`/activity-user-status/${recordId}`)
      .send({ status: 'HOLIDAY' })
      .expect(200);

    expect(updateRes.body.status).toBe('HOLIDAY');
    expect(updateRes.body.user).toBeDefined();
  });

  it('bulk updates availability records for a user across a date range', async () => {
    const companyRes = await request(app.getHttpServer())
      .post('/companies')
      .send({ name: 'Delta' })
      .expect(201);

    const companyId = companyRes.body.id;

    const createdUser = await prismaMock.user.create({
      data: {
        companyId,
        unitId: '11111111-1111-1111-1111-111111111111',
        firstName: 'Bulk',
        lastName: 'User',
        phone: '0500000001',
        personalNumber: '100003',
        isActive: true,
      },
    });

    const activityRes = await request(app.getHttpServer())
      .post(`/companies/${companyId}/activities`)
      .send({
        name: 'Bulk Update Test',
        startDate: '2026-01-01',
        endDate: '2026-01-03',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/activities/${activityRes.body.id}/availability/generate`)
      .expect(201);

    const bulkRes = await request(app.getHttpServer())
      .patch(`/activities/${activityRes.body.id}/availability/bulk`)
      .send({
        userIds: [createdUser.id],
        startDate: '2026-01-01',
        endDate: '2026-01-03',
        availability: 'UNAVAILABLE',
      })
      .expect(200);

    expect(bulkRes.body.updatedCount).toBe(2);
    expect(bulkRes.body.updatedRecords).toHaveLength(2);
    expect(bulkRes.body.updatedRecords.every((record: any) => record.availability === 'UNAVAILABLE')).toBe(true);
  });

  afterEach(async () => {
    await app.close();
  });
});
