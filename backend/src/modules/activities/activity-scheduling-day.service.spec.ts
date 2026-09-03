import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
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
    prisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<unknown>) => callback(prisma));
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
        reasons: [],
      }),
    };
    service = new ActivitySchedulingDayService(prisma as any, validationService as any, taskInstancesService as any);

    prisma.activity.findUnique.mockResolvedValue(activity);
    prisma.activityTaskManpowerRequirement.findMany.mockResolvedValue([]);
    prisma.activityTaskRoleRequirement.findMany.mockResolvedValue([]);
    prisma.activityTaskQualificationRequirement.findMany.mockResolvedValue([]);
    prisma.activityUserStatus.findMany.mockResolvedValue([]);
    prisma.activitySchedulingDay.findUnique.mockResolvedValue(null);
    prisma.activitySchedulingDay.create.mockResolvedValue({
      id: 'scheduling-day-1',
      activityId: 'activity-1',
      date: new Date('2026-08-15T00:00:00.000Z'),
      openedAt: new Date('2026-08-14T09:00:00.000Z'),
      openedByUserId: 'user-1',
      createdAt: new Date('2026-08-14T09:00:00.000Z'),
      updatedAt: new Date('2026-08-14T09:00:00.000Z'),
    });
    prisma.taskInstance.findMany.mockResolvedValue([]);
    prisma.taskInstance.create.mockImplementation(async ({ data }: { data: any }) => ({
      id: `copied-${data.activityTaskId}-${new Date(data.startTime).toISOString()}`,
      ...data,
    }));
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', companyId: 'company-1' });
    prisma.userPermission.findMany.mockResolvedValue([
      { permission: { key: 'MANAGE_COMPANIES' } },
      { permission: { key: 'APPROVE_SCHEDULING' } },
    ]);
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

  it('returns isDayOpened=false when no scheduling-day row exists for the day', async () => {
    prisma.taskInstance.findMany.mockResolvedValue([]);

    const result = await service.getSchedulingDay('activity-1', '2026-08-15');

    expect(result.isDayOpened).toBe(false);
    expect(result.schedulingStatus).toBe('DRAFT');
    expect(result.taskInstances).toEqual([]);
  });

  it('returns isDayOpened=true for an opened day with zero task instances', async () => {
    prisma.taskInstance.findMany.mockResolvedValue([]);
    prisma.activitySchedulingDay.findUnique.mockResolvedValue({
      id: 'scheduling-day-1',
      approvalStatus: 'PENDING_APPROVAL',
    });

    const result = await service.getSchedulingDay('activity-1', '2026-08-15');

    expect(result.isDayOpened).toBe(true);
    expect(result.schedulingStatus).toBe('PENDING_APPROVAL');
    expect(result.taskInstances).toEqual([]);
  });

  it('does not infer isDayOpened=true from task instances alone', async () => {
    prisma.taskInstance.findMany.mockResolvedValue([buildTaskInstance()]);
    prisma.activitySchedulingDay.findUnique.mockResolvedValue(null);

    const result = await service.getSchedulingDay('activity-1', '2026-08-15');

    expect(result.isDayOpened).toBe(false);
    expect(result.schedulingStatus).toBe('DRAFT');
    expect(result.taskInstances).toHaveLength(1);
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
      severity: 'CRITICAL',
      reasonCodes: ['MISSING_REQUIRED_QUALIFICATION'],
      reasonMessages: ['User is missing a required qualification'],
      reasons: [
        {
          code: 'MISSING_REQUIRED_QUALIFICATION',
          severity: 'CRITICAL',
          message: 'User is missing a required qualification',
          qualificationId: 'qual-1',
          qualificationName: 'CPR',
        },
      ],
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
      severity: 'CRITICAL',
      reasonCodes: ['MISSING_REQUIRED_QUALIFICATION'],
      reasonMessages: ['User is missing a required qualification'],
      reasons: [
        {
          code: 'MISSING_REQUIRED_QUALIFICATION',
          severity: 'CRITICAL',
          message: 'User is missing a required qualification',
          qualificationId: 'qual-1',
          qualificationName: 'CPR',
        },
      ],
    });
  });

  it('rejects invalid date values', async () => {
    await expect(service.getSchedulingDay('activity-1', '2026-02-31')).rejects.toThrow(BadRequestException);
  });

  it('rejects dates outside activity boundaries for the read model', async () => {
    await expect(service.getSchedulingDay('activity-1', '2026-08-21')).rejects.toThrow(BadRequestException);
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

  it('opens a valid scheduling day and returns a minimal opened response', async () => {
    const result = await service.openSchedulingDay('activity-1', '2026-08-15', 'user-1');

    expect(prisma.activitySchedulingDay.create).toHaveBeenCalledWith({
      data: {
        activityId: 'activity-1',
        date: new Date('2026-08-15T00:00:00.000Z'),
        openedByUserId: 'user-1',
      },
    });
    expect(result).toEqual({
      activityId: 'activity-1',
      date: '2026-08-15',
      isDayOpened: true,
    });
  });

  it('stores openedByUserId and openedAt through the persisted scheduling-day row', async () => {
    await service.openSchedulingDay('activity-1', '2026-08-15', 'user-1');

    expect(prisma.activitySchedulingDay.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          openedByUserId: 'user-1',
        }),
      }),
    );
    expect(prisma.activitySchedulingDay.create.mock.results[0]?.value).resolves.toEqual(
      expect.objectContaining({
        openedAt: new Date('2026-08-14T09:00:00.000Z'),
      }),
    );
  });

  it('rejects invalid date format when opening a day', async () => {
    await expect(service.openSchedulingDay('activity-1', '2026-02-31', 'user-1')).rejects.toThrow(BadRequestException);
  });

  it('rejects dates outside activity boundaries when opening a day', async () => {
    await expect(service.openSchedulingDay('activity-1', '2026-08-21', 'user-1')).rejects.toThrow(BadRequestException);
  });

  it('rejects an opener from another company', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-9', companyId: 'company-9' });

    await expect(service.openSchedulingDay('activity-1', '2026-08-15', 'user-9')).rejects.toThrow(NotFoundException);
  });

  it('opens a non-first day by copying previous-day task instance configuration without assignments', async () => {
    prisma.taskInstance.findMany.mockResolvedValue([
      {
        id: 'prev-instance-1',
        activityTaskId: 'task-1',
        title: 'Morning Shift',
        startTime: new Date('2026-08-14T08:00:00.000Z'),
        endTime: new Date('2026-08-14T16:00:00.000Z'),
        activityTask: {
          activityId: 'activity-1',
        },
      },
      {
        id: 'prev-instance-2',
        activityTaskId: 'task-2',
        title: 'Night Shift',
        startTime: new Date('2026-08-14T22:00:00.000Z'),
        endTime: new Date('2026-08-15T06:00:00.000Z'),
        activityTask: {
          activityId: 'activity-1',
        },
      },
    ]);

    await service.openSchedulingDay('activity-1', '2026-08-15', 'user-1');

    expect(prisma.taskInstance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          activityTask: { activityId: 'activity-1' },
          startTime: { lt: new Date('2026-08-15T00:00:00.000Z') },
          endTime: { gt: new Date('2026-08-14T00:00:00.000Z') },
        }),
      }),
    );

    expect(prisma.taskInstance.create).toHaveBeenCalledTimes(2);
    expect(prisma.taskInstance.create).toHaveBeenNthCalledWith(1, {
      data: {
        activityTaskId: 'task-1',
        title: 'Morning Shift',
        startTime: new Date('2026-08-15T08:00:00.000Z'),
        endTime: new Date('2026-08-15T16:00:00.000Z'),
      },
    });
    expect(prisma.taskInstance.create).toHaveBeenNthCalledWith(2, {
      data: {
        activityTaskId: 'task-2',
        title: 'Night Shift',
        startTime: new Date('2026-08-15T22:00:00.000Z'),
        endTime: new Date('2026-08-16T06:00:00.000Z'),
      },
    });
    expect(prisma.assignment.create).not.toHaveBeenCalled();
  });

  it('creates independent task instances with new ids when copying from previous day', async () => {
    prisma.taskInstance.findMany.mockResolvedValue([
      {
        id: 'prev-instance-1',
        activityTaskId: 'task-1',
        title: 'Morning Shift',
        startTime: new Date('2026-08-14T08:00:00.000Z'),
        endTime: new Date('2026-08-14T16:00:00.000Z'),
        activityTask: {
          activityId: 'activity-1',
        },
      },
    ]);

    await service.openSchedulingDay('activity-1', '2026-08-15', 'user-1');

    const createdRows = await Promise.all(prisma.taskInstance.create.mock.results.map((result: { value: Promise<any> }) => result.value));

    expect(createdRows).toHaveLength(1);
    expect(createdRows[0].id).not.toBe('prev-instance-1');
  });

  it('opening a day whose previous day has no task instances succeeds and leaves the new day empty', async () => {
    prisma.taskInstance.findMany.mockResolvedValue([]);

    const result = await service.openSchedulingDay('activity-1', '2026-08-15', 'user-1');

    expect(result).toEqual({
      activityId: 'activity-1',
      date: '2026-08-15',
      isDayOpened: true,
    });
    expect(prisma.taskInstance.create).not.toHaveBeenCalled();
  });

  it('opening the first activity day preserves behavior and does not attempt previous-day copy', async () => {
    const result = await service.openSchedulingDay('activity-1', '2026-08-10', 'user-1');

    expect(result).toEqual({
      activityId: 'activity-1',
      date: '2026-08-10',
      isDayOpened: true,
    });
    expect(prisma.taskInstance.findMany).not.toHaveBeenCalled();
    expect(prisma.taskInstance.create).not.toHaveBeenCalled();
  });

  it('is idempotent when opening an already-opened day and does not duplicate task instances', async () => {
    prisma.activitySchedulingDay.findUnique.mockResolvedValue({
      id: 'scheduling-day-1',
    });

    const result = await service.openSchedulingDay('activity-1', '2026-08-15', 'user-1');

    expect(prisma.activitySchedulingDay.create).not.toHaveBeenCalled();
    expect(prisma.taskInstance.findMany).not.toHaveBeenCalled();
    expect(prisma.taskInstance.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      activityId: 'activity-1',
      date: '2026-08-15',
      isDayOpened: true,
    });
  });

  it('opening the new day does not mutate previous-day assignments', async () => {
    prisma.taskInstance.findMany.mockResolvedValue([
      {
        id: 'prev-instance-1',
        activityTaskId: 'task-1',
        title: 'Morning Shift',
        startTime: new Date('2026-08-14T08:00:00.000Z'),
        endTime: new Date('2026-08-14T16:00:00.000Z'),
        activityTask: {
          activityId: 'activity-1',
        },
      },
    ]);

    await service.openSchedulingDay('activity-1', '2026-08-15', 'user-1');

    expect(prisma.assignment.create).not.toHaveBeenCalled();
    expect(prisma.assignment.delete).not.toHaveBeenCalled();
    expect(prisma.assignment.findMany).not.toHaveBeenCalled();
  });

  it('preserves activityTask linkage so requirements/configuration remain derived from existing model', async () => {
    prisma.taskInstance.findMany.mockResolvedValue([
      {
        id: 'prev-instance-1',
        activityTaskId: 'task-9',
        title: 'Support Shift',
        startTime: new Date('2026-08-14T10:00:00.000Z'),
        endTime: new Date('2026-08-14T18:00:00.000Z'),
        activityTask: {
          activityId: 'activity-1',
        },
      },
    ]);

    await service.openSchedulingDay('activity-1', '2026-08-15', 'user-1');

    expect(prisma.taskInstance.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          activityTaskId: 'task-9',
        }),
      }),
    );
  });

  it('submit: transitions DRAFT to PENDING_APPROVAL for an opened day', async () => {
    prisma.activitySchedulingDay.findUnique.mockResolvedValue({
      id: 'scheduling-day-1',
      approvalStatus: 'DRAFT',
    });

    const result = await service.submitSchedulingDayForApproval('activity-1', '2026-08-15', 'user-1');

    expect(prisma.activitySchedulingDay.update).toHaveBeenCalledWith({
      where: {
        activityId_date: {
          activityId: 'activity-1',
          date: new Date('2026-08-15T00:00:00.000Z'),
        },
      },
      data: {
        approvalStatus: 'PENDING_APPROVAL',
      },
    });
    expect(result.schedulingStatus).toBe('PENDING_APPROVAL');
  });

  it('submit: rejects users without editor permission', async () => {
    prisma.userPermission.findMany.mockResolvedValue([{ permission: { key: 'APPROVE_SCHEDULING' } }]);
    prisma.activitySchedulingDay.findUnique.mockResolvedValue({
      id: 'scheduling-day-1',
      approvalStatus: 'DRAFT',
    });

    await expect(service.submitSchedulingDayForApproval('activity-1', '2026-08-15', 'user-1')).rejects.toThrow(ForbiddenException);
  });

  it('approve: transitions PENDING_APPROVAL to APPROVED for approvers', async () => {
    prisma.activitySchedulingDay.findUnique.mockResolvedValue({
      id: 'scheduling-day-1',
      approvalStatus: 'PENDING_APPROVAL',
    });

    const result = await service.approveSchedulingDay('activity-1', '2026-08-15', 'user-1');

    expect(prisma.activitySchedulingDay.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { approvalStatus: 'APPROVED' },
      }),
    );
    expect(result.schedulingStatus).toBe('APPROVED');
  });

  it('approve: rejects users without scheduling approval permission', async () => {
    prisma.userPermission.findMany.mockResolvedValue([{ permission: { key: 'MANAGE_COMPANIES' } }]);
    prisma.activitySchedulingDay.findUnique.mockResolvedValue({
      id: 'scheduling-day-1',
      approvalStatus: 'PENDING_APPROVAL',
    });

    await expect(service.approveSchedulingDay('activity-1', '2026-08-15', 'user-1')).rejects.toThrow(ForbiddenException);
  });

  it('return: transitions PENDING_APPROVAL to DRAFT for approvers', async () => {
    prisma.activitySchedulingDay.findUnique.mockResolvedValue({
      id: 'scheduling-day-1',
      approvalStatus: 'PENDING_APPROVAL',
    });

    const result = await service.returnSchedulingDayToDraft('activity-1', '2026-08-15', 'user-1');

    expect(prisma.activitySchedulingDay.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { approvalStatus: 'DRAFT' },
      }),
    );
    expect(result.schedulingStatus).toBe('DRAFT');
  });

  it('rejects invalid approval workflow transitions', async () => {
    prisma.activitySchedulingDay.findUnique.mockResolvedValue({
      id: 'scheduling-day-1',
      approvalStatus: 'DRAFT',
    });

    await expect(service.approveSchedulingDay('activity-1', '2026-08-15', 'user-1')).rejects.toThrow(BadRequestException);
  });

  it('handles repeated transition requests safely without duplicate side effects', async () => {
    prisma.activitySchedulingDay.findUnique.mockResolvedValue({
      id: 'scheduling-day-1',
      approvalStatus: 'APPROVED',
    });

    const result = await service.approveSchedulingDay('activity-1', '2026-08-15', 'user-1');

    expect(prisma.activitySchedulingDay.update).not.toHaveBeenCalled();
    expect(result).toEqual({
      activityId: 'activity-1',
      date: '2026-08-15',
      isDayOpened: true,
      schedulingStatus: 'APPROVED',
    });
  });

  it('approval transitions do not alter task instances, assignments, personnel status, or availability records', async () => {
    prisma.activitySchedulingDay.findUnique.mockResolvedValue({
      id: 'scheduling-day-1',
      approvalStatus: 'PENDING_APPROVAL',
    });

    await service.approveSchedulingDay('activity-1', '2026-08-15', 'user-1');

    expect(prisma.taskInstance.create).not.toHaveBeenCalled();
    expect(prisma.taskInstance.delete).not.toHaveBeenCalled();
    expect(prisma.assignment.create).not.toHaveBeenCalled();
    expect(prisma.assignment.delete).not.toHaveBeenCalled();
    expect(prisma.activityUserStatus.create).not.toHaveBeenCalled();
    expect(prisma.activityUserStatus.update).not.toHaveBeenCalled();
    expect(prisma.activityUserStatus.delete).not.toHaveBeenCalled();
    expect(prisma.activityUserAvailability.create).not.toHaveBeenCalled();
    expect(prisma.activityUserAvailability.update).not.toHaveBeenCalled();
    expect(prisma.activityUserAvailability.delete).not.toHaveBeenCalled();
  });

  it('does not leak opened rows from adjacent days', async () => {
    prisma.taskInstance.findMany.mockResolvedValue([]);
    prisma.activitySchedulingDay.findUnique.mockImplementation(({ where }: { where: { activityId_date: { date: Date } } }) => {
      const date = where.activityId_date.date.toISOString();
      return date === '2026-08-15T00:00:00.000Z' ? null : { id: 'other-day' };
    });

    const result = await service.getSchedulingDay('activity-1', '2026-08-15');

    expect(result.isDayOpened).toBe(false);
  });
});
