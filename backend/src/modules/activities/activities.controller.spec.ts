import { INestApplication, RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { ActivitySchedulingDayService } from './activity-scheduling-day.service';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { PERMISSION_METADATA_KEY } from '../auth/permission.decorator';

describe('ActivitiesController', () => {
  let app: INestApplication;
  let schedulingDayService: { getSchedulingDay: jest.Mock; openSchedulingDay: jest.Mock };

  beforeEach(async () => {
    schedulingDayService = {
      getSchedulingDay: jest.fn(),
      openSchedulingDay: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [ActivitiesController],
      providers: [
        {
          provide: ActivitiesService,
          useValue: {
            create: jest.fn(),
            findAllByCompany: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: ActivitySchedulingDayService,
          useValue: schedulingDayService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: { switchToHttp: () => { getRequest: () => { user?: { id: string } } } }) => {
          context.switchToHttp().getRequest().user = { id: 'user-1' };
          return true;
        },
      })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('delegates GET scheduling day requests to the scheduling service and returns the result unchanged', async () => {
    const responsePayload = {
      activity: {
        id: 'activity-1',
        companyId: 'company-1',
        name: 'Daily Ops',
        status: 'ACTIVE',
        startDate: '2026-08-10T00:00:00.000Z',
        endDate: '2026-08-20T00:00:00.000Z',
      },
      date: '2026-08-15',
      isDayOpened: true,
      taskInstances: [],
    };

    schedulingDayService.getSchedulingDay.mockResolvedValue(responsePayload);

    const res = await request(app.getHttpServer())
      .get('/activities/activity-1/scheduling/day')
      .query({ date: '2026-08-15' })
      .expect(200);

    expect(schedulingDayService.getSchedulingDay).toHaveBeenCalledWith('activity-1', '2026-08-15');
    expect(res.body).toEqual(responsePayload);
  });

  it('rejects invalid date query values using controller validation pipes', async () => {
    await request(app.getHttpServer())
      .get('/activities/activity-1/scheduling/day')
      .query({ date: '15-08-2026' })
      .expect(400);

    expect(schedulingDayService.getSchedulingDay).not.toHaveBeenCalled();
  });

  it('delegates POST scheduling day open requests to the scheduling service and returns the result unchanged', async () => {
    const responsePayload = {
      activityId: 'activity-1',
      date: '2026-08-15',
      isDayOpened: true,
    };

    schedulingDayService.openSchedulingDay.mockResolvedValue(responsePayload);

    const res = await request(app.getHttpServer())
      .post('/activities/activity-1/scheduling/day/open')
      .send({ date: '2026-08-15' })
      .expect(201);

    expect(schedulingDayService.openSchedulingDay).toHaveBeenCalledWith('activity-1', '2026-08-15', 'user-1');
    expect(res.body).toEqual(responsePayload);
  });

  it('rejects invalid open-day request body values using controller validation pipes', async () => {
    await request(app.getHttpServer())
      .post('/activities/activity-1/scheduling/day/open')
      .send({ date: '15-08-2026' })
      .expect(400);

    expect(schedulingDayService.openSchedulingDay).not.toHaveBeenCalled();
  });

  it('keeps authorization guards and permission metadata applied to the scheduling endpoint', () => {
    const classGuards = Reflect.getMetadata(GUARDS_METADATA, ActivitiesController) as Function[];
    const requiredPermission = Reflect.getMetadata(PERMISSION_METADATA_KEY, ActivitiesController) as string;

    expect(classGuards).toEqual([AuthGuard, PermissionGuard]);
    expect(requiredPermission).toBe('MANAGE_COMPANIES');

    const methodPath = Reflect.getMetadata(PATH_METADATA, ActivitiesController.prototype.getSchedulingDay) as string;
    const methodType = Reflect.getMetadata(METHOD_METADATA, ActivitiesController.prototype.getSchedulingDay) as RequestMethod;
    const openMethodPath = Reflect.getMetadata(PATH_METADATA, ActivitiesController.prototype.openSchedulingDay) as string;
    const openMethodType = Reflect.getMetadata(METHOD_METADATA, ActivitiesController.prototype.openSchedulingDay) as RequestMethod;

    expect(methodPath).toBe('activities/:activityId/scheduling/day');
    expect(methodType).toBe(RequestMethod.GET);
    expect(openMethodPath).toBe('activities/:activityId/scheduling/day/open');
    expect(openMethodType).toBe(RequestMethod.POST);
  });
});
