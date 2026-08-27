import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ActivitySchedulingDayService } from './activity-scheduling-day.service';
import { createPrismaMock } from '../../test/prisma.mock';

describe('ActivitySchedulingDayService', () => {
  let prisma: any;
  let validationService: { validate: jest.Mock };
  let taskInstancesService: { evaluateCandidate: jest.Mock };
  let service: ActivitySchedulingDayService;

  const activity = {
    id: 'activity-1',
    companyId: 'company-1',
    name: 'Daily Ops',
    status: 'ACTIVE',
    startDate: new Date('2026-08-10T00:00:00.000Z'),
    endDate: new Date('2026-08-20T00:00:00.000Z'),
  };

  const buildTaskInstance = (overrides: Record<string, any> = {}) => ({
    id: 'instance-1',
    activityTaskId: 'task-1',
    title: 'Morning Shift',
    startTime: new Date('2026-08-15T08:00:00.000Z'),
    endTime: new Date('2026-08-15T16:00:00.000Z'),
    createdAt: new Date('2026-08-10T00:00:00.000Z'),
    updatedAt: new Date('2026-08-10T00:00:00.000Z'),
    activityTask: {
      id: 'task-1',
      activityId: 'activity-1',
      name: 'Setup',
      description: null,
    },
    assignments: [],
    ...overrides,
  });

  beforeEach(() => {
    prisma = createPrismaMock();
    validationService = {
      validate: jest.fn().mockResolvedValue({
        requiredErrors: [],
        warnings: [],
        summary: { isValid: true },
      }),
    };
    taskInstancesService = {
      evaluateCandidate: jest.fn().mockResolvedValue({
        userId: 'user-1',
        severity: 'NORMAL',
        reasonCodes: [],
        reasonMessages: [],
      }),
    };
    service = new ActivitySchedulingDayService(prisma as any, validationService as any, taskInstancesService as any);

    prisma.activity.findUnique.mockResolvedValue(activity);
    prisma.activityTaskManpowerRequirement.findMany.mockResolvedValue([]);
    prisma.activityTaskRoleRequirement.findMany.mockResolvedValue([]);
    prisma.activityTaskQualificationRequirement.findMany.mockResolvedValue([]);
    prisma.activityUserStatus.findMany.mockResolvedValue([]);
  });

  it('returns only requested activity/day instances and uses day intersection query', async () => {
    const instance = buildTaskInstance();
    prisma.taskInstance.findMany.mockResolvedValue([instance]);

    const result = await service.getSchedulingDay('activity-1', '2026-08-15');

    expect(prisma.taskInstance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          activityTask: { activityId: 'activity-1' },
          startTime: { lt: new Date('2026-08-16T00:00:00.000Z') },
          endTime: { gt: new Date('2026-08-15T00:00:00.000Z') },
        }),
      }),
    );
    expect(result.taskInstances).toHaveLength(1);
    expect(result.taskInstances[0].id).toBe('instance-1');
  });

  it('includes overnight instances that intersect the requested day', async () => {
    const overnight = buildTaskInstance({
      id: 'instance-overnight',
      title: 'Night Shift',
      startTime: new Date('2026-08-14T22:00:00.000Z'),
      endTime: new Date('2026-08-15T06:00:00.000Z'),
    });
    prisma.taskInstance.findMany.mockResolvedValue([overnight]);

    const result = await service.getSchedulingDay('activity-1', '2026-08-15');

    expect(result.taskInstances).toHaveLength(1);
    expect(result.taskInstances[0].id).toBe('instance-overnight');
    expect(result.taskInstances[0].isOvernight).toBe(true);
  });

  it('returns isDayOpened=false when no task instances exist for the day', async () => {
    prisma.taskInstance.findMany.mockResolvedValue([]);

    const result = await service.getSchedulingDay('activity-1', '2026-08-15');

    expect(result.isDayOpened).toBe(false);
    expect(result.taskInstances).toEqual([]);
  });

  it('maps requirements and derives assignment slots from manpower requirement', async () => {
    prisma.taskInstance.findMany.mockResolvedValue([
      buildTaskInstance({
        assignments: [
          {
            id: 'assignment-1',
            taskInstanceId: 'instance-1',
            userId: 'user-1',
            createdBy: 'admin-1',
            createdAt: new Date('2026-08-10T00:00:00.000Z'),
            updatedAt: new Date('2026-08-10T00:00:00.000Z'),
            user: {
              id: 'user-1',
              firstName: 'Ada',
              lastName: 'Lovelace',
              personalNumber: 'P1',
              phone: null,
              email: 'ada@example.com',
              isActive: true,
              unit: null,
            },
          },
        ],
      }),
    ]);
    prisma.activityTaskManpowerRequirement.findMany.mockResolvedValue([
      { activityTaskId: 'task-1', required: true, quantity: 3 },
    ]);
    prisma.activityTaskRoleRequirement.findMany.mockResolvedValue([
      { activityTaskId: 'task-1', roleId: 'role-1', required: true, quantity: 1, role: { name: 'Medic' } },
    ]);
    prisma.activityTaskQualificationRequirement.findMany.mockResolvedValue([
      { activityTaskId: 'task-1', qualificationId: 'qual-1', required: false, quantity: 1, qualification: { name: 'CPR' } },
    ]);

    const result = await service.getSchedulingDay('activity-1', '2026-08-15');

    expect(result.taskInstances[0].requirements.manpower).toEqual({ required: true, quantity: 3 });
    expect(result.taskInstances[0].requirements.roles).toEqual([
      { roleId: 'role-1', required: true, quantity: 1, roleName: 'Medic' },
    ]);
    expect(result.taskInstances[0].requirements.qualifications).toEqual([
      { qualificationId: 'qual-1', required: false, quantity: 1, qualificationName: 'CPR' },
    ]);
    expect(result.taskInstances[0].assignmentSlots).toEqual({ total: 3, filled: 1, unfilled: 2 });
  });

  it('reuses validation and assignment candidate evaluation semantics', async () => {
    prisma.taskInstance.findMany.mockResolvedValue([
      buildTaskInstance({
        assignments: [
          {
            id: 'assignment-1',
            taskInstanceId: 'instance-1',
            userId: 'user-1',
            createdBy: null,
            createdAt: new Date('2026-08-10T00:00:00.000Z'),
            updatedAt: new Date('2026-08-10T00:00:00.000Z'),
            user: {
              id: 'user-1',
              firstName: 'Ada',
              lastName: 'Lovelace',
              personalNumber: 'P1',
              phone: null,
              email: null,
              isActive: true,
              unit: null,
            },
          },
        ],
      }),
    ]);
    validationService.validate.mockResolvedValue({
      requiredErrors: [{ type: 'MANPOWER', message: 'Missing required manpower' }],
      warnings: [{ type: 'ROLE', message: 'Optional role requirement is missing' }],
      summary: { isValid: false },
    });
    taskInstancesService.evaluateCandidate.mockResolvedValue({
      userId: 'user-1',
      severity: 'WARNING',
      reasonCodes: ['MISSING_REQUIRED_QUALIFICATION'],
      reasonMessages: ['User is missing a required qualification'],
    });

    const result = await service.getSchedulingDay('activity-1', '2026-08-15');

    expect(validationService.validate).toHaveBeenCalledWith('instance-1');
    expect(taskInstancesService.evaluateCandidate).toHaveBeenCalledWith('instance-1', 'user-1');
    expect(result.taskInstances[0].validation).toEqual({
      requiredErrors: [{ type: 'MANPOWER', message: 'Missing required manpower' }],
      warnings: [{ type: 'ROLE', message: 'Optional role requirement is missing' }],
      summary: { isValid: false },
    });
    expect(result.taskInstances[0].assignments[0].evaluation).toEqual({
      userId: 'user-1',
      severity: 'WARNING',
      reasonCodes: ['MISSING_REQUIRED_QUALIFICATION'],
      reasonMessages: ['User is missing a required qualification'],
    });
  });

  it('rejects invalid date values', async () => {
    await expect(service.getSchedulingDay('activity-1', '2026-02-31')).rejects.toThrow(BadRequestException);
  });

  it('does not leak task instances from another activity', async () => {
    prisma.taskInstance.findMany.mockResolvedValue([
      buildTaskInstance(),
      buildTaskInstance({
        id: 'instance-foreign',
        activityTaskId: 'task-foreign',
        activityTask: {
          id: 'task-foreign',
          activityId: 'activity-2',
          name: 'Foreign',
          description: null,
        },
      }),
    ]);

    const result = await service.getSchedulingDay('activity-1', '2026-08-15');

    expect(result.taskInstances).toHaveLength(1);
    expect(result.taskInstances[0].id).toBe('instance-1');
  });

  it('throws when the activity does not exist', async () => {
    prisma.activity.findUnique.mockResolvedValue(null);

    await expect(service.getSchedulingDay('missing-activity', '2026-08-15')).rejects.toThrow(NotFoundException);
  });
});
