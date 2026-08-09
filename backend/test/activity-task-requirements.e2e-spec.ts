import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { ActivityTaskRequirementsController } from '../src/modules/activity-task-requirements/activity-task-requirements.controller';
import { ActivityTaskRequirementsService } from '../src/modules/activity-task-requirements/activity-task-requirements.service';
import { ActivityTasksController } from '../src/modules/activity-tasks/activity-tasks.controller';
import { ActivityTasksService } from '../src/modules/activity-tasks/activity-tasks.service';
import { ActivitiesController } from '../src/modules/activities/activities.controller';
import { ActivitiesService } from '../src/modules/activities/activities.service';
import { CompaniesController } from '../src/modules/companies/companies.controller';
import { CompaniesService } from '../src/modules/companies/companies.service';
import { RolesController } from '../src/modules/roles/roles.controller';
import { RolesService } from '../src/modules/roles/roles.service';
import { QualificationsController } from '../src/modules/qualifications/qualifications.controller';
import { QualificationsService } from '../src/modules/qualifications/qualifications.service';
import { AuthService } from '../src/modules/auth/auth.service';
import { AuthGuard } from '../src/modules/auth/auth.guard';
import { PermissionGuard } from '../src/modules/auth/permission.guard';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Activity task requirements e2e', () => {
  let app: INestApplication<App>;
  let prismaMock: any;

  beforeEach(async () => {
    const state = {
      companies: new Map<string, any>(),
      activities: new Map<string, any>(),
      activityTasks: new Map<string, any>(),
      roles: new Map<string, any>(),
      qualifications: new Map<string, any>(),
      manpowerRequirements: new Map<string, any>(),
      roleRequirements: new Map<string, any>(),
      qualificationRequirements: new Map<string, any>(),
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
          const activity = { id: randomUUID(), companyId: data.companyId, name: data.name, startDate: data.startDate, endDate: data.endDate, status: data.status, createdAt: new Date(), updatedAt: new Date() };
          state.activities.set(activity.id, activity);
          return activity;
        }),
        findUnique: jest.fn(async ({ where: { id } }: any) => state.activities.get(id) ?? null),
      },
      activityTask: {
        create: jest.fn(async ({ data }: any) => {
          const activity = state.activities.get(data.activityId);
          const task = {
            id: randomUUID(),
            activityId: data.activityId,
            name: data.name,
            description: data.description ?? null,
            activity: activity ? { companyId: activity.companyId } : null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
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
      userPermission: {
        findMany: jest.fn().mockResolvedValue([{ permission: { key: 'MANAGE_COMPANIES' } }]),
      },
      role: {
        create: jest.fn(async ({ data }: any) => {
          const role = { id: randomUUID(), companyId: data.companyId, name: data.name, description: data.description ?? null, createdAt: new Date(), updatedAt: new Date() };
          state.roles.set(role.id, role);
          return role;
        }),
        findUnique: jest.fn(async ({ where: { id } }: any) => state.roles.get(id) ?? null),
      },
      user: {
        findUnique: jest.fn(async ({ where: { id } }: any) => {
          if (id === 'user-1') {
            return { id: 'user-1', email: 'test@example.com', firstName: 'Test', lastName: 'User', isActive: true };
          }
          return null;
        }),
      },
      qualification: {
        create: jest.fn(async ({ data }: any) => {
          const qualification = { id: randomUUID(), companyId: data.companyId, name: data.name, description: data.description ?? null, createdAt: new Date(), updatedAt: new Date() };
          state.qualifications.set(qualification.id, qualification);
          return qualification;
        }),
        findUnique: jest.fn(async ({ where: { id } }: any) => state.qualifications.get(id) ?? null),
      },
      activityTaskManpowerRequirement: {
        findUnique: jest.fn(async ({ where: { activityTaskId } }: any) => state.manpowerRequirements.get(activityTaskId) ?? null),
        findMany: jest.fn(async ({ where: { activityTaskId } }: any) => Array.from(state.manpowerRequirements.values()).filter((entry) => entry.activityTaskId === activityTaskId)),
        deleteMany: jest.fn(async ({ where: { activityTaskId } }: any) => {
          for (const [key, value] of Array.from(state.manpowerRequirements.entries())) {
            if (value.activityTaskId === activityTaskId) {
              state.manpowerRequirements.delete(key);
            }
          }
          return { count: 1 };
        }),
        create: jest.fn(async ({ data }: any) => {
          const requirement = { id: randomUUID(), activityTaskId: data.activityTaskId, required: data.required, quantity: data.quantity, createdAt: new Date(), updatedAt: new Date() };
          state.manpowerRequirements.set(data.activityTaskId, requirement);
          return requirement;
        }),
      },
      activityTaskRoleRequirement: {
        findMany: jest.fn(async ({ where: { activityTaskId } }: any) => Array.from(state.roleRequirements.values()).filter((entry) => entry.activityTaskId === activityTaskId)),
        deleteMany: jest.fn(async ({ where: { activityTaskId } }: any) => {
          for (const [key, value] of Array.from(state.roleRequirements.entries())) {
            if (value.activityTaskId === activityTaskId) {
              state.roleRequirements.delete(key);
            }
          }
          return { count: 1 };
        }),
        create: jest.fn(async ({ data }: any) => {
          const requirement = { id: randomUUID(), activityTaskId: data.activityTaskId, roleId: data.roleId, required: data.required, quantity: data.quantity, createdAt: new Date(), updatedAt: new Date() };
          state.roleRequirements.set(`${data.activityTaskId}:${data.roleId}`, requirement);
          return requirement;
        }),
      },
      activityTaskQualificationRequirement: {
        findMany: jest.fn(async ({ where: { activityTaskId } }: any) => Array.from(state.qualificationRequirements.values()).filter((entry) => entry.activityTaskId === activityTaskId)),
        deleteMany: jest.fn(async ({ where: { activityTaskId } }: any) => {
          for (const [key, value] of Array.from(state.qualificationRequirements.entries())) {
            if (value.activityTaskId === activityTaskId) {
              state.qualificationRequirements.delete(key);
            }
          }
          return { count: 1 };
        }),
        create: jest.fn(async ({ data }: any) => {
          const requirement = { id: randomUUID(), activityTaskId: data.activityTaskId, qualificationId: data.qualificationId, required: data.required, quantity: data.quantity, createdAt: new Date(), updatedAt: new Date() };
          state.qualificationRequirements.set(`${data.activityTaskId}:${data.qualificationId}`, requirement);
          return requirement;
        }),
      },
      $transaction: jest.fn(async (callback: any) => callback(prismaMock)),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CompaniesController, ActivitiesController, ActivityTasksController, ActivityTaskRequirementsController, RolesController, QualificationsController],
      providers: [
        CompaniesService,
        ActivitiesService,
        ActivityTasksService,
        ActivityTaskRequirementsService,
        RolesService,
        QualificationsService,
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

  it('replaces and reads activity task requirements for the same company', async () => {
    const companyRes = await request(app.getHttpServer()).post('/companies').send({ name: 'Alpha' }).expect(201);
    const companyId = companyRes.body.id;

    const activityRes = await request(app.getHttpServer()).post(`/companies/${companyId}/activities`).send({ name: 'Launch', startDate: '2026-01-01', endDate: '2026-01-02' }).expect(201);
    const activityId = activityRes.body.id;

    const taskRes = await request(app.getHttpServer()).post(`/activities/${activityId}/tasks`).send({ name: 'Setup' }).expect(201);
    const activityTaskId = taskRes.body.id;

    const roleRes = await request(app.getHttpServer()).post(`/companies/${companyId}/roles`).send({ name: 'Engineer' }).expect(201);
    const qualificationRes = await request(app.getHttpServer()).post(`/companies/${companyId}/qualifications`).send({ name: 'Safety' }).expect(201);

    const putRes = await request(app.getHttpServer())
      .put(`/activity-tasks/${activityTaskId}/requirements`)
      .send({
        manpower: { quantity: 2, required: true },
        roles: [{ roleId: roleRes.body.id, quantity: 2, required: true }],
        qualifications: [{ qualificationId: qualificationRes.body.id, quantity: 1, required: false }],
      })
      .expect(200);

    expect(putRes.body.manpower).toEqual({ quantity: 2, required: true });
    expect(putRes.body.roles[0].roleId).toBe(roleRes.body.id);

    const getRes = await request(app.getHttpServer()).get(`/activity-tasks/${activityTaskId}/requirements`).expect(200);
    expect(getRes.body.manpower).toEqual({ quantity: 2, required: true });
    expect(getRes.body.roles[0].roleId).toBe(roleRes.body.id);
    expect(getRes.body.qualifications[0].qualificationId).toBe(qualificationRes.body.id);
  });

  afterEach(async () => {
    await app.close();
  });
});
