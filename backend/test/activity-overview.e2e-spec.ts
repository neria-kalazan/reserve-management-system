import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Activity overview e2e', () => {
  let app: INestApplication<App>;
  let prisma: any;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        activity: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'activity-1',
            name: 'Ops',
            startDate: new Date('2026-01-01T00:00:00.000Z'),
            endDate: new Date('2026-01-03T00:00:00.000Z'),
            status: 'ACTIVE',
            company: { id: 'company-1', name: 'Reserve Co', status: 'ACTIVE' },
          }),
        },
        activityUserStatus: {
          findMany: jest.fn().mockResolvedValue([
            { userId: 'u1', status: 'ACTIVE', availability: 'ALL_DAY' },
            { userId: 'u2', status: 'SICK', availability: 'MORNING' },
          ]),
        },
        activityTask: {
          findMany: jest.fn().mockResolvedValue([{ id: 'task-1', name: 'Setup' }]),
        },
        taskInstance: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'instance-1',
            startTime: new Date('2026-01-01T09:00:00.000Z'),
            activityTask: { id: 'task-1', activity: { id: 'activity-1' } },
          }),
          findMany: jest.fn().mockResolvedValue([{ id: 'instance-1', title: 'Morning shift', activityTaskId: 'task-1' }]),
        },
        assignment: {
          findMany: jest.fn().mockResolvedValue([{ taskInstanceId: 'instance-1', userId: 'u1' }]),
        },
        company: {
          findUnique: jest.fn().mockResolvedValue({ id: 'company-1', name: 'Reserve Co', status: 'ACTIVE' }),
        },
        activityTaskManpowerRequirement: {
          findUnique: jest.fn().mockResolvedValue({ required: false, quantity: 0 }),
        },
        activityTaskRoleRequirement: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        activityTaskQualificationRequirement: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        user: {
          findMany: jest.fn().mockResolvedValue([{ id: 'u1', userRoles: [], userQualifications: [] }]),
        },
      })
      .compile();

    prisma = moduleFixture.get(PrismaService);
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('returns overview data for an activity', async () => {
    const res = await request(app.getHttpServer()).get('/activities/activity-1/overview').expect(200);
    expect(res.body.activity.id).toBe('activity-1');
    expect(res.body.manpowerSummary.participantCount).toBe(2);
    expect(res.body.tasksOverview[0].taskName).toBe('Setup');
  });

  afterEach(async () => {
    await app.close();
  });
});
