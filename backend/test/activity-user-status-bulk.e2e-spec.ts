import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Activity availability bulk e2e', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        activity: {
          findUnique: jest.fn().mockResolvedValue({ id: 'activity-1', companyId: 'company-1' }),
        },
        user: {
          findMany: jest.fn().mockResolvedValue([{ id: 'user-1', companyId: 'company-1' }, { id: 'user-2', companyId: 'company-1' }]),
        },
        activityUserStatus: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'status-1', activityId: 'activity-1', userId: 'user-1', date: new Date('2026-01-01'), status: 'ACTIVE', availability: 'ALL_DAY' },
            { id: 'status-2', activityId: 'activity-1', userId: 'user-2', date: new Date('2026-01-02'), status: 'ACTIVE', availability: 'MORNING' },
          ]),
          update: jest.fn().mockImplementation(async ({ where: { id }, data }) => ({ id, availability: data.availability })),
        },
        $transaction: jest.fn(async (callback: any) => callback({
          activityUserStatus: {
            findMany: jest.fn().mockResolvedValue([
              { id: 'status-1', activityId: 'activity-1', userId: 'user-1', date: new Date('2026-01-01'), status: 'ACTIVE', availability: 'ALL_DAY' },
              { id: 'status-2', activityId: 'activity-1', userId: 'user-2', date: new Date('2026-01-02'), status: 'ACTIVE', availability: 'MORNING' },
            ]),
            update: jest.fn().mockImplementation(async ({ where: { id }, data }) => ({ id, availability: data.availability })),
          },
        })),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('bulk updates availability for matching records', async () => {
    const res = await request(app.getHttpServer())
      .patch('/activities/activity-1/availability/bulk')
      .send({
        userIds: ['user-1', 'user-2'],
        startDate: '2026-01-01',
        endDate: '2026-01-02',
        availability: 'EVENING',
      })
      .expect(200);

    expect(res.body.updatedCount).toBe(2);
  });

  afterEach(async () => {
    await app.close();
  });
});
