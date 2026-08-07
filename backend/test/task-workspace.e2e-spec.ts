import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Task workspace e2e', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        taskInstance: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'instance-1',
            title: 'Morning shift',
            startTime: new Date('2026-01-01T09:00:00.000Z'),
            endTime: new Date('2026-01-01T17:00:00.000Z'),
            activityTask: { id: 'task-1', name: 'Setup', activity: { id: 'activity-1' } },
          }),
        },
        activityTaskManpowerRequirement: {
          findUnique: jest.fn().mockResolvedValue({ required: true, quantity: 1 }),
        },
        activityTaskRoleRequirement: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        activityTaskQualificationRequirement: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        assignment: {
          findMany: jest.fn().mockResolvedValue([{ id: 'assignment-1', userId: 'user-1', user: { id: 'user-1', firstName: 'Ada', lastName: 'Lovelace' } }]),
        },
        activityUserStatus: {
          findMany: jest.fn().mockResolvedValue([{ status: 'ACTIVE', availability: 'ALL_DAY', user: { id: 'user-2', firstName: 'Grace', lastName: 'Hopper', phone: '', email: '', personalNumber: '', isActive: true } }]),
        },
        activityTask: {
          findUnique: jest.fn().mockResolvedValue({ id: 'task-1' }),
        },
        activityTaskRequirement: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        user: {
          findMany: jest.fn().mockResolvedValue([{ id: 'user-1', userRoles: [], userQualifications: [] }]),
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('returns workspace data for a task instance', async () => {
    const res = await request(app.getHttpServer()).get('/task-instances/instance-1/workspace').expect(200);
    expect(res.body.taskInstance.id).toBe('instance-1');
    expect(res.body.requirements.manpower.required).toBe(true);
    expect(res.body.currentAssignments).toHaveLength(1);
    expect(res.body.candidates).toHaveLength(1);
  });

  afterEach(async () => {
    await app.close();
  });
});
