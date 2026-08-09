import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { CompaniesController } from '../src/modules/companies/companies.controller';
import { CompaniesService } from '../src/modules/companies/companies.service';
import { UnitsController } from '../src/modules/units/units.controller';
import { UnitsService } from '../src/modules/units/units.service';
import { UsersController } from '../src/modules/users/users.controller';
import { UsersService } from '../src/modules/users/users.service';
import { UserRolesController } from '../src/modules/user-roles/user-roles.controller';
import { UserRolesService } from '../src/modules/user-roles/user-roles.service';
import { UserQualificationsController } from '../src/modules/user-qualifications/user-qualifications.controller';
import { UserQualificationsService } from '../src/modules/user-qualifications/user-qualifications.service';
import { UserPermissionsController } from '../src/modules/user-permissions/user-permissions.controller';
import { UserPermissionsService } from '../src/modules/user-permissions/user-permissions.service';
import { AuthService } from '../src/modules/auth/auth.service';
import { AuthGuard } from '../src/modules/auth/auth.guard';
import { PermissionGuard } from '../src/modules/auth/permission.guard';
import { PrismaService } from '../src/prisma/prisma.service';

describe('User management e2e', () => {
  let app: INestApplication<App>;
  let prismaMock: any;

  beforeEach(async () => {
    const state = {
      companies: new Map<string, any>(),
      units: new Map<string, any>(),
      users: new Map<string, any>(),
      roles: new Map<string, any>(),
      qualifications: new Map<string, any>(),
      permissions: new Map<string, any>(),
      userRoles: [] as Array<{ userId: string; roleId: string }>,
      userQualifications: [] as Array<{ userId: string; qualificationId: string }>,
      userPermissions: [] as Array<{ userId: string; permissionId: string }>,
    };

    prismaMock = {
      company: {
        create: jest.fn(async ({ data }: any) => {
          const company = {
            id: randomUUID(),
            name: data.name,
            status: data.status,
            ownerUserId: data.ownerUserId ?? null,
          };
          state.companies.set(company.id, company);
          return company;
        }),
        findUnique: jest.fn(async ({ where: { id } }: any) => state.companies.get(id) ?? null),
        findMany: jest.fn(async () => Array.from(state.companies.values())),
      },
      unit: {
        create: jest.fn(async ({ data }: any) => {
          const unit = {
            id: randomUUID(),
            companyId: data.companyId,
            name: data.name,
            description: data.description ?? null,
            displayOrder: data.displayOrder ?? 0,
            createdAt: new Date().toISOString(),
          };
          state.units.set(unit.id, unit);
          return unit;
        }),
        findUnique: jest.fn(async ({ where: { id } }: any) => state.units.get(id) ?? null),
        findMany: jest.fn(async ({ where: { companyId } }: any) => Array.from(state.units.values()).filter((unit) => unit.companyId === companyId)),
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
            isActive: data.isActive,
          };
          state.users.set(user.id, user);
          return {
            ...user,
            unit: state.units.get(data.unitId)
              ? {
                  id: state.units.get(data.unitId).id,
                  name: state.units.get(data.unitId).name,
                  description: state.units.get(data.unitId).description,
                  displayOrder: state.units.get(data.unitId).displayOrder,
                }
              : null,
          };
        }),
        findUnique: jest.fn(async ({ where: { id } }: any) => {
          if (id === 'user-1') {
            return { id: 'user-1', email: 'test@example.com', firstName: 'Test', lastName: 'User', isActive: true };
          }
          const user = state.users.get(id);
          if (!user) return null;
          return {
            id: user.id,
            companyId: user.companyId,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            email: user.email,
            personalNumber: user.personalNumber,
            isActive: user.isActive,
            company: state.companies.get(user.companyId)
              ? { id: state.companies.get(user.companyId).id, name: state.companies.get(user.companyId).name }
              : null,
            unit: state.units.get(user.unitId)
              ? {
                  id: state.units.get(user.unitId).id,
                  name: state.units.get(user.unitId).name,
                  description: state.units.get(user.unitId).description,
                  displayOrder: state.units.get(user.unitId).displayOrder,
                }
              : null,
          };
        }),
        findMany: jest.fn(async ({ where: { companyId } }: any) => Array.from(state.users.values()).filter((user) => user.companyId === companyId).map((user) => ({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          email: user.email,
          personalNumber: user.personalNumber,
          isActive: user.isActive,
          unit: state.units.get(user.unitId)
            ? {
                id: state.units.get(user.unitId).id,
                name: state.units.get(user.unitId).name,
                description: state.units.get(user.unitId).description,
                displayOrder: state.units.get(user.unitId).displayOrder,
              }
            : null,
        }))),
      },
      role: {
        findUnique: jest.fn(async ({ where: { id } }: any) => state.roles.get(id) ?? null),
      },
      qualification: {
        findUnique: jest.fn(async ({ where: { id } }: any) => state.qualifications.get(id) ?? null),
      },
      permission: {
        findUnique: jest.fn(async ({ where: { id } }: any) => state.permissions.get(id) ?? null),
      },
      userRole: {
        create: jest.fn(async ({ data }: any) => {
          const relation = { userId: data.userId, roleId: data.roleId };
          state.userRoles.push(relation);
          return relation;
        }),
      },
      userQualification: {
        create: jest.fn(async ({ data }: any) => {
          const relation = { userId: data.userId, qualificationId: data.qualificationId };
          state.userQualifications.push(relation);
          return relation;
        }),
      },
      userPermission: {
        create: jest.fn(async ({ data }: any) => {
          const relation = { userId: data.userId, permissionId: data.permissionId };
          state.userPermissions.push(relation);
          return relation;
        }),
        findMany: jest.fn().mockResolvedValue([{ permission: { key: 'MANAGE_COMPANIES' } }]),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        CompaniesController,
        UnitsController,
        UsersController,
        UserRolesController,
        UserQualificationsController,
        UserPermissionsController,
      ],
      providers: [
        CompaniesService,
        UnitsService,
        UsersService,
        UserRolesService,
        UserQualificationsService,
        UserPermissionsService,
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
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
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

  it('covers the main user-management flow through the HTTP layer', async () => {
    const companyRes = await request(app.getHttpServer())
      .post('/companies')
      .send({ name: 'Acme' })
      .expect(201);

    const companyId = companyRes.body.id;
    const roleId = randomUUID();
    const qualificationId = randomUUID();
    const permissionId = randomUUID();

    const unitRes = await request(app.getHttpServer())
      .post(`/companies/${companyId}/units`)
      .send({ name: 'Operations' })
      .expect(201);

    prismaMock.role.findUnique.mockImplementation(async ({ where: { id } }: any) => {
      if (id === roleId) {
        return { id: roleId, companyId };
      }
      return null;
    });

    prismaMock.qualification.findUnique.mockImplementation(async ({ where: { id } }: any) => {
      if (id === qualificationId) {
        return { id: qualificationId, companyId };
      }
      return null;
    });

    prismaMock.permission.findUnique.mockImplementation(async ({ where: { id } }: any) => {
      if (id === permissionId) {
        return { id: permissionId };
      }
      return null;
    });

    const userRes = await request(app.getHttpServer())
      .post(`/companies/${companyId}/users`)
      .send({
        firstName: 'Ada',
        lastName: 'Lovelace',
        phone: '050-1234567',
        personalNumber: 'P-001',
        unitId: unitRes.body.id,
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/companies/${companyId}/users`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveLength(1);
        expect(res.body[0].personalNumber).toBe('P-001');
      });

    await request(app.getHttpServer())
      .post(`/users/${userRes.body.id}/roles/${roleId}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/users/${userRes.body.id}/qualifications/${qualificationId}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/users/${userRes.body.id}/permissions/${permissionId}`)
      .expect(201);
  });

  afterEach(async () => {
    await app.close();
  });
});
