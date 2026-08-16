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
import { UserImportController } from '../src/modules/user-import/user-import.controller';
import { UserImportService } from '../src/modules/user-import/user-import.service';
import { AuthService } from '../src/modules/auth/auth.service';
import { AuthGuard } from '../src/modules/auth/auth.guard';
import { PermissionGuard } from '../src/modules/auth/permission.guard';
import { PrismaService } from '../src/prisma/prisma.service';

describe('User import e2e', () => {
  let app: INestApplication<App>;
  let prismaMock: any;

  beforeEach(async () => {
    const state = {
      companies: new Map<string, any>(),
      units: new Map<string, any>(),
      users: new Map<string, any>(),
    };

    prismaMock = {
      userPermission: {
        findMany: jest.fn().mockResolvedValue([{ permission: { key: 'MANAGE_COMPANIES' } }]),
      },
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
        findFirst: jest.fn(async ({ where: { companyId, name } }: any) => {
          for (const unit of state.units.values()) {
            if (unit.companyId === companyId && unit.name === name) {
              return unit;
            }
          }
          return null;
        }),
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
          return user;
        }),
        findUnique: jest.fn(async ({ where: { id } }: any) => {
          if (id === 'user-1') {
            return { id: 'user-1', email: 'test@example.com', firstName: 'Test', lastName: 'User', isActive: true };
          }
          return null;
        }),
        findMany: jest.fn(async ({ where: { companyId } }: any) => Array.from(state.users.values())
          .filter((user) => user.companyId === companyId)
          .map((user) => ({
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
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        CompaniesController,
        UnitsController,
        UsersController,
        UserImportController,
      ],
      providers: [
        CompaniesService,
        UnitsService,
        UsersService,
        UserImportService,
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

  it('imports users from CSV and exposes them through the company users endpoint', async () => {
    const companyRes = await request(app.getHttpServer())
      .post('/companies')
      .send({ name: 'Alpha Corp' })
      .expect(201);

    const companyId = companyRes.body.id;

    await request(app.getHttpServer())
      .post(`/companies/${companyId}/units`)
      .send({ name: 'Infantry' })
      .expect(201);

    const csv = 'firstName,lastName,phone,personalNumber,unitName\nJohn,Doe,0501234567,123456789,Infantry\n';

    const importRes = await request(app.getHttpServer())
      .post(`/companies/${companyId}/users/import`)
      .attach('file', Buffer.from(csv), { filename: 'users.csv', contentType: 'text/csv' })
      .expect(201);

    expect(importRes.body).toEqual({ created: 1, failed: 0, errors: [] });

    const usersRes = await request(app.getHttpServer())
      .get(`/companies/${companyId}/users`)
      .expect(200);

    expect(usersRes.body).toMatchObject({
      page: 1,
      pageSize: 10,
      total: 1,
    });
    expect(usersRes.body.items).toHaveLength(1);
    expect(usersRes.body.items[0]).toMatchObject({
      firstName: 'John',
      lastName: 'Doe',
      personalNumber: '123456789',
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
