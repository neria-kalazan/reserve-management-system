import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TaskInstancesService } from './task-instances.service';
import { createPrismaMock } from '../../test/prisma.mock';

describe('TaskInstancesService', () => {
  let prisma: any;
  let service: TaskInstancesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    prisma.$transaction.mockImplementation(async (callback: any) => callback(prisma));
    service = new TaskInstancesService(prisma);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create: creates a task instance for a valid activity task', async () => {
    prisma.activityTask.findUnique.mockResolvedValue({ id: 'task-1' });
    prisma.taskInstance.create.mockResolvedValue({ id: 'instance-1', activityTaskId: 'task-1', title: 'Setup' });

    const res = await service.create('task-1', { title: 'Setup', startTime: '2026-01-01T09:00:00.000Z', endTime: '2026-01-01T17:00:00.000Z' } as any);

    expect(res).toBeDefined();
    expect(prisma.taskInstance.create).toHaveBeenCalled();
  });

  it('create: allows missing title and persists empty title', async () => {
    prisma.activityTask.findUnique.mockResolvedValue({ id: 'task-1' });
    prisma.taskInstance.create.mockResolvedValue({ id: 'instance-1', activityTaskId: 'task-1', title: '' });

    const res = await service.create('task-1', {
      startTime: '2026-01-01T09:00:00.000Z',
      endTime: '2026-01-01T17:00:00.000Z',
    } as any);

    expect(res).toBeDefined();
    expect(prisma.taskInstance.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: '' }),
      }),
    );
  });

  it('create: rejects a missing activity task', async () => {
    prisma.activityTask.findUnique.mockResolvedValue(null);

    await expect(service.create('task-1', { title: 'Setup', startTime: '2026-01-01T09:00:00.000Z', endTime: '2026-01-01T17:00:00.000Z' } as any)).rejects.toThrow(NotFoundException);
  });

  it('create: rejects an invalid date range', async () => {
    prisma.activityTask.findUnique.mockResolvedValue({ id: 'task-1' });

    await expect(service.create('task-1', { title: 'Setup', startTime: '2026-01-01T17:00:00.000Z', endTime: '2026-01-01T09:00:00.000Z' } as any)).rejects.toThrow(BadRequestException);
  });

  it('bulkCreate: rejects a missing activity task', async () => {
    prisma.activityTask.findUnique.mockResolvedValue(null);

    await expect(service.bulkCreate('task-1', { startDate: '2026-08-01', endDate: '2026-08-03', startTime: '06:00', endTime: '14:00' } as any)).rejects.toThrow(NotFoundException);
  });

  it('bulkCreate: rejects an invalid date range', async () => {
    prisma.activityTask.findUnique.mockResolvedValue({ id: 'task-1', name: 'Patrol' });

    await expect(service.bulkCreate('task-1', { startDate: '2026-08-03', endDate: '2026-08-01', startTime: '06:00', endTime: '14:00' } as any)).rejects.toThrow(BadRequestException);
  });

  it('bulkCreate: creates one task instance per day', async () => {
    prisma.activityTask.findUnique.mockResolvedValue({ id: 'task-1', name: 'Patrol' });
    prisma.taskInstance.create.mockImplementation(async ({ data }: any) => ({ id: `instance-${data.startTime.toISOString()}`, ...data }));

    const res = await service.bulkCreate('task-1', { startDate: '2026-08-01', endDate: '2026-08-03', startTime: '06:00', endTime: '14:00' } as any);

    expect(res.createdCount).toBe(3);
    expect(res.createdTaskInstances).toHaveLength(3);
    expect(prisma.taskInstance.create).toHaveBeenCalledTimes(3);
    expect(res.createdTaskInstances[0].title).toBe('Patrol');
  });

  it('bulkCreate: preserves overnight shift handling', async () => {
    prisma.activityTask.findUnique.mockResolvedValue({ id: 'task-1', name: 'Patrol' });
    prisma.taskInstance.create.mockImplementation(async ({ data }: any) => ({ id: `instance-${data.startTime.toISOString()}`, ...data }));

    const res = await service.bulkCreate('task-1', { startDate: '2026-08-01', endDate: '2026-08-01', startTime: '22:00', endTime: '06:00' } as any);

    expect(res.createdCount).toBe(1);
    expect(res.createdTaskInstances[0].startTime).toEqual(new Date('2026-08-01T19:00:00.000Z'));
    expect(res.createdTaskInstances[0].endTime).toEqual(new Date('2026-08-02T03:00:00.000Z'));
  });

  it('findAllByActivityTask: throws when the activity task is missing', async () => {
    prisma.activityTask.findUnique.mockResolvedValue(null);

    await expect(service.findAllByActivityTask('task-1')).rejects.toThrow(NotFoundException);
  });

  it('findOne: throws when the task instance is missing', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue(null);

    await expect(service.findOne('instance-1')).rejects.toThrow(NotFoundException);
  });

  it('update: rejects an invalid date range after update', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue({ id: 'instance-1', title: 'Setup', startTime: new Date('2026-01-01T09:00:00.000Z'), endTime: new Date('2026-01-01T17:00:00.000Z') });

    await expect(service.update('instance-1', { startTime: '2026-01-01T20:00:00.000Z', endTime: '2026-01-01T18:00:00.000Z' } as any)).rejects.toThrow(BadRequestException);
  });

  it('update: allows clearing title to empty string', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue({
      id: 'instance-1',
      title: 'Setup',
      startTime: new Date('2026-01-01T09:00:00.000Z'),
      endTime: new Date('2026-01-01T17:00:00.000Z'),
    });
    prisma.taskInstance.update.mockResolvedValue({
      id: 'instance-1',
      title: '',
      startTime: new Date('2026-01-01T09:00:00.000Z'),
      endTime: new Date('2026-01-01T17:00:00.000Z'),
    });

    const res = await service.update('instance-1', { title: '' } as any);

    expect(res.title).toBe('');
    expect(prisma.taskInstance.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'instance-1' },
        data: expect.objectContaining({ title: '' }),
      }),
    );
  });

  it('delete: removes the existing task instance', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue({ id: 'instance-1' });
    prisma.taskInstance.delete.mockResolvedValue({ id: 'instance-1' });

    await expect(service.delete('instance-1')).resolves.toEqual({ id: 'instance-1' });
  });

  it.each([
    ['ACTIVE + MORNING + morning task', new Date('2026-01-01T09:00:00.000Z'), 'ACTIVE', 'MORNING', true],
    ['ACTIVE + MORNING + evening task', new Date('2026-01-01T15:00:00.000Z'), 'ACTIVE', 'MORNING', false],
    ['ACTIVE + EVENING + evening task', new Date('2026-01-01T15:00:00.000Z'), 'ACTIVE', 'EVENING', true],
    ['ACTIVE + EVENING + morning task', new Date('2026-01-01T09:00:00.000Z'), 'ACTIVE', 'EVENING', false],
    ['ACTIVE + ALL_DAY + any task', new Date('2026-01-01T15:00:00.000Z'), 'ACTIVE', 'ALL_DAY', true],
    ['ACTIVE + UNAVAILABLE', new Date('2026-01-01T09:00:00.000Z'), 'ACTIVE', 'UNAVAILABLE', false],
    ['HOLIDAY + ALL_DAY', new Date('2026-01-01T09:00:00.000Z'), 'HOLIDAY', 'ALL_DAY', false],
  ])('findAvailableUsers: %s', async (_label, startTime, status, availability, expected) => {
    prisma.taskInstance.findUnique.mockResolvedValue({
      id: 'instance-1',
      startTime,
      activityTask: { id: 'task-1', activity: { id: 'activity-1', companyId: 'company-1' } },
    });
    prisma.activityUserStatus.findMany.mockResolvedValue([{ userId: 'user-1', status, availability }]);
    prisma.assignment.findMany.mockResolvedValue([]);
    prisma.activityTaskRoleRequirement.findMany.mockResolvedValue([]);
    prisma.activityTaskQualificationRequirement.findMany.mockResolvedValue([]);
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'user-1',
        firstName: 'Ada',
        lastName: 'Lovelace',
        phone: null,
        email: 'ada@example.com',
        personalNumber: 'P1',
        isActive: true,
        userRoles: [],
        userQualifications: [],
      },
    ]);

    const res = await service.findAvailableUsers('instance-1');

    if (expected) {
      expect(res).toEqual([{ id: 'user-1', firstName: 'Ada', lastName: 'Lovelace', phone: null, email: 'ada@example.com', personalNumber: 'P1', isActive: true }]);
    } else {
      expect(res).toEqual([]);
    }
  });

  it('findAvailableUsers: excludes already assigned users', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue({
      id: 'instance-1',
      startTime: new Date('2026-01-01T09:00:00.000Z'),
      activityTask: { id: 'task-1', activity: { id: 'activity-1', companyId: 'company-1' } },
    });
    prisma.activityUserStatus.findMany.mockResolvedValue([{ userId: 'user-1', status: 'ACTIVE', availability: 'ALL_DAY' }]);
    prisma.assignment.findMany.mockResolvedValue([{ userId: 'user-1' }]);
    prisma.activityTaskRoleRequirement.findMany.mockResolvedValue([]);
    prisma.activityTaskQualificationRequirement.findMany.mockResolvedValue([]);
    prisma.user.findMany.mockImplementation(({ where }: any) => {
      if (!where?.id?.in?.length) {
        return [];
      }
      return [{
        id: 'user-1',
        firstName: 'Ada',
        lastName: 'Lovelace',
        phone: null,
        email: 'ada@example.com',
        personalNumber: 'P1',
        isActive: true,
        userRoles: [],
        userQualifications: [],
      }];
    });

    const res = await service.findAvailableUsers('instance-1');

    expect(res).toEqual([]);
  });

  it('findAvailableUsers: returns only NORMAL candidates', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue({
      id: 'instance-1',
      startTime: new Date('2026-01-01T09:00:00.000Z'),
      activityTask: { id: 'task-1', activity: { id: 'activity-1', companyId: 'company-1' } },
    });
    prisma.activityUserStatus.findMany.mockResolvedValue([
      {
        userId: 'user-1',
        status: 'ACTIVE',
        availability: 'ALL_DAY',
      },
      {
        userId: 'user-2',
        status: 'ACTIVE',
        availability: 'ALL_DAY',
      },
    ]);
    prisma.assignment.findMany.mockResolvedValue([]);
    prisma.activityTaskRoleRequirement.findMany.mockResolvedValue([{ roleId: 'role-1', required: true }]);
    prisma.activityTaskQualificationRequirement.findMany.mockResolvedValue([{ qualificationId: 'qual-1', required: true }]);
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'user-1',
        firstName: 'Ada',
        lastName: 'Lovelace',
        phone: null,
        email: 'ada@example.com',
        personalNumber: 'P1',
        isActive: true,
        userRoles: [{ roleId: 'role-1' }],
        userQualifications: [{ qualificationId: 'qual-1' }],
      },
      {
        id: 'user-2',
        firstName: 'Grace',
        lastName: 'Hopper',
        phone: null,
        email: 'grace@example.com',
        personalNumber: 'P2',
        isActive: true,
        userRoles: [],
        userQualifications: [{ qualificationId: 'qual-1' }],
      },
    ]);

    const res = await service.findAvailableUsers('instance-1');

    expect(res).toEqual([
      {
        id: 'user-1',
        firstName: 'Ada',
        lastName: 'Lovelace',
        phone: null,
        email: 'ada@example.com',
        personalNumber: 'P1',
        isActive: true,
      },
    ]);
  });

  it('findAvailableUsers: throws when the task instance is missing', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue(null);

    await expect(service.findAvailableUsers('instance-1')).rejects.toThrow(NotFoundException);
  });

  it('evaluateCandidate: returns NORMAL when the user has no exception', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue({
      id: 'instance-1',
      startTime: new Date('2026-01-01T09:00:00.000Z'),
      activityTask: { id: 'task-1', activity: { id: 'activity-1', companyId: 'company-1' } },
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      companyId: 'company-1',
      userRoles: [{ roleId: 'role-1' }],
      userQualifications: [{ qualificationId: 'qual-1' }],
    });
    prisma.activityTaskRoleRequirement.findMany.mockResolvedValue([{ roleId: 'role-1', required: true, role: { name: 'Medic' } }]);
    prisma.activityTaskQualificationRequirement.findMany.mockResolvedValue([{ qualificationId: 'qual-1', required: true, qualification: { name: 'CPR' } }]);
    prisma.activityUserStatus.findMany.mockResolvedValue([{ userId: 'user-1', status: 'ACTIVE', availability: 'ALL_DAY' }]);

    const res = await service.evaluateCandidate('instance-1', 'user-1');

    expect(res).toEqual({
      userId: 'user-1',
      severity: 'NORMAL',
      reasonCodes: [],
      reasonMessages: [],
      reasons: [],
    });
  });

  it('evaluateCandidate: returns CRITICAL for a missing required qualification', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue({
      id: 'instance-1',
      startTime: new Date('2026-01-01T09:00:00.000Z'),
      activityTask: { id: 'task-1', activity: { id: 'activity-1', companyId: 'company-1' } },
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      companyId: 'company-1',
      userRoles: [{ roleId: 'role-1' }],
      userQualifications: [],
    });
    prisma.activityTaskRoleRequirement.findMany.mockResolvedValue([{ roleId: 'role-1', required: true, role: { name: 'Medic' } }]);
    prisma.activityTaskQualificationRequirement.findMany.mockResolvedValue([{ qualificationId: 'qual-1', required: true, qualification: { name: 'CPR' } }]);
    prisma.activityUserStatus.findMany.mockResolvedValue([{ userId: 'user-1', status: 'ACTIVE', availability: 'ALL_DAY' }]);

    const res = await service.evaluateCandidate('instance-1', 'user-1');

    expect(res).toEqual({
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

  it('evaluateCandidate: returns CRITICAL for a missing required role', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue({
      id: 'instance-1',
      startTime: new Date('2026-01-01T09:00:00.000Z'),
      activityTask: { id: 'task-1', activity: { id: 'activity-1', companyId: 'company-1' } },
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      companyId: 'company-1',
      userRoles: [],
      userQualifications: [{ qualificationId: 'qual-1' }],
    });
    prisma.activityTaskRoleRequirement.findMany.mockResolvedValue([{ roleId: 'role-1', required: true, role: { name: 'Medic' } }]);
    prisma.activityTaskQualificationRequirement.findMany.mockResolvedValue([{ qualificationId: 'qual-1', required: true, qualification: { name: 'CPR' } }]);
    prisma.activityUserStatus.findMany.mockResolvedValue([{ userId: 'user-1', status: 'ACTIVE', availability: 'ALL_DAY' }]);

    const res = await service.evaluateCandidate('instance-1', 'user-1');

    expect(res).toEqual({
      userId: 'user-1',
      severity: 'CRITICAL',
      reasonCodes: ['MISSING_REQUIRED_ROLE'],
      reasonMessages: ['User is missing a required role'],
      reasons: [
        {
          code: 'MISSING_REQUIRED_ROLE',
          severity: 'CRITICAL',
          message: 'User is missing a required role',
          roleId: 'role-1',
          roleName: 'Medic',
        },
      ],
    });
  });

  it('evaluateCandidate: returns WARNING for a missing optional role', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue({
      id: 'instance-1',
      startTime: new Date('2026-01-01T09:00:00.000Z'),
      activityTask: { id: 'task-1', activity: { id: 'activity-1', companyId: 'company-1' } },
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      companyId: 'company-1',
      userRoles: [],
      userQualifications: [{ qualificationId: 'qual-1' }],
    });
    prisma.activityTaskRoleRequirement.findMany.mockResolvedValue([{ roleId: 'role-2', required: false, role: { name: 'Driver' } }]);
    prisma.activityTaskQualificationRequirement.findMany.mockResolvedValue([{ qualificationId: 'qual-1', required: true, qualification: { name: 'CPR' } }]);
    prisma.activityUserStatus.findMany.mockResolvedValue([{ userId: 'user-1', status: 'ACTIVE', availability: 'ALL_DAY' }]);

    const res = await service.evaluateCandidate('instance-1', 'user-1');

    expect(res).toEqual({
      userId: 'user-1',
      severity: 'WARNING',
      reasonCodes: ['MISSING_OPTIONAL_ROLE'],
      reasonMessages: ['User is missing an optional role'],
      reasons: [
        {
          code: 'MISSING_OPTIONAL_ROLE',
          severity: 'WARNING',
          message: 'User is missing an optional role',
          roleId: 'role-2',
          roleName: 'Driver',
        },
      ],
    });
  });

  it('evaluateCandidate: returns WARNING for a missing optional qualification', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue({
      id: 'instance-1',
      startTime: new Date('2026-01-01T09:00:00.000Z'),
      activityTask: { id: 'task-1', activity: { id: 'activity-1', companyId: 'company-1' } },
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      companyId: 'company-1',
      userRoles: [{ roleId: 'role-1' }],
      userQualifications: [],
    });
    prisma.activityTaskRoleRequirement.findMany.mockResolvedValue([{ roleId: 'role-1', required: true, role: { name: 'Medic' } }]);
    prisma.activityTaskQualificationRequirement.findMany.mockResolvedValue([{ qualificationId: 'qual-2', required: false, qualification: { name: 'Radio' } }]);
    prisma.activityUserStatus.findMany.mockResolvedValue([{ userId: 'user-1', status: 'ACTIVE', availability: 'ALL_DAY' }]);

    const res = await service.evaluateCandidate('instance-1', 'user-1');

    expect(res).toEqual({
      userId: 'user-1',
      severity: 'WARNING',
      reasonCodes: ['MISSING_OPTIONAL_QUALIFICATION'],
      reasonMessages: ['User is missing an optional qualification'],
      reasons: [
        {
          code: 'MISSING_OPTIONAL_QUALIFICATION',
          severity: 'WARNING',
          message: 'User is missing an optional qualification',
          qualificationId: 'qual-2',
          qualificationName: 'Radio',
        },
      ],
    });
  });

  it('evaluateCandidate: keeps availability problems as WARNING', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue({
      id: 'instance-1',
      startTime: new Date('2026-01-01T18:00:00.000Z'),
      activityTask: { id: 'task-1', activity: { id: 'activity-1', companyId: 'company-1' } },
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      companyId: 'company-1',
      userRoles: [{ roleId: 'role-1' }],
      userQualifications: [{ qualificationId: 'qual-1' }],
    });
    prisma.activityTaskRoleRequirement.findMany.mockResolvedValue([{ roleId: 'role-1', required: true, role: { name: 'Medic' } }]);
    prisma.activityTaskQualificationRequirement.findMany.mockResolvedValue([{ qualificationId: 'qual-1', required: true, qualification: { name: 'CPR' } }]);
    prisma.activityUserStatus.findMany.mockResolvedValue([{ userId: 'user-1', status: 'ACTIVE', availability: 'MORNING' }]);

    const res = await service.evaluateCandidate('instance-1', 'user-1');

    expect(res).toEqual({
      userId: 'user-1',
      severity: 'WARNING',
      reasonCodes: ['UNAVAILABLE_FOR_TIME_WINDOW'],
      reasonMessages: ['User is not available for this task time'],
      reasons: [
        {
          code: 'UNAVAILABLE_FOR_TIME_WINDOW',
          severity: 'WARNING',
          message: 'User is not available for this task time',
        },
      ],
    });
  });

  it('evaluateCandidate: keeps inactive user as CRITICAL', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue({
      id: 'instance-1',
      startTime: new Date('2026-01-01T09:00:00.000Z'),
      activityTask: { id: 'task-1', activity: { id: 'activity-1', companyId: 'company-1' } },
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      companyId: 'company-1',
      userRoles: [{ roleId: 'role-1' }],
      userQualifications: [{ qualificationId: 'qual-1' }],
    });
    prisma.activityTaskRoleRequirement.findMany.mockResolvedValue([{ roleId: 'role-1', required: true, role: { name: 'Medic' } }]);
    prisma.activityTaskQualificationRequirement.findMany.mockResolvedValue([{ qualificationId: 'qual-1', required: true, qualification: { name: 'CPR' } }]);
    prisma.activityUserStatus.findMany.mockResolvedValue([{ userId: 'user-1', status: 'SICK', availability: 'ALL_DAY' }]);

    const res = await service.evaluateCandidate('instance-1', 'user-1');

    expect(res).toEqual({
      userId: 'user-1',
      severity: 'CRITICAL',
      reasonCodes: ['USER_STATUS_NOT_ACTIVE'],
      reasonMessages: ['User status is not active for this task date'],
      reasons: [
        {
          code: 'USER_STATUS_NOT_ACTIVE',
          severity: 'CRITICAL',
          message: 'User status is not active for this task date',
        },
      ],
    });
  });

  it('evaluateCandidate: returns highest severity and all reason codes', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue({
      id: 'instance-1',
      startTime: new Date('2026-01-01T09:00:00.000Z'),
      activityTask: { id: 'task-1', activity: { id: 'activity-1', companyId: 'company-1' } },
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      companyId: 'company-1',
      userRoles: [],
      userQualifications: [],
    });
    prisma.activityTaskRoleRequirement.findMany.mockResolvedValue([
      { roleId: 'role-1', required: true, role: { name: 'Medic' } },
      { roleId: 'role-2', required: false, role: { name: 'Driver' } },
    ]);
    prisma.activityTaskQualificationRequirement.findMany.mockResolvedValue([
      { qualificationId: 'qual-1', required: true, qualification: { name: 'CPR' } },
      { qualificationId: 'qual-2', required: false, qualification: { name: 'Radio' } },
    ]);
    prisma.activityUserStatus.findMany.mockResolvedValue([{ userId: 'user-1', status: 'ACTIVE', availability: 'EVENING' }]);

    const res = await service.evaluateCandidate('instance-1', 'user-1');

    expect(res).toEqual({
      userId: 'user-1',
      severity: 'CRITICAL',
      reasonCodes: [
        'MISSING_REQUIRED_ROLE',
        'MISSING_OPTIONAL_ROLE',
        'MISSING_REQUIRED_QUALIFICATION',
        'MISSING_OPTIONAL_QUALIFICATION',
        'UNAVAILABLE_FOR_TIME_WINDOW',
      ],
      reasonMessages: [
        'User is missing a required role',
        'User is missing an optional role',
        'User is missing a required qualification',
        'User is missing an optional qualification',
        'User is not available for this task time',
      ],
      reasons: [
        {
          code: 'MISSING_REQUIRED_ROLE',
          severity: 'CRITICAL',
          message: 'User is missing a required role',
          roleId: 'role-1',
          roleName: 'Medic',
        },
        {
          code: 'MISSING_OPTIONAL_ROLE',
          severity: 'WARNING',
          message: 'User is missing an optional role',
          roleId: 'role-2',
          roleName: 'Driver',
        },
        {
          code: 'MISSING_REQUIRED_QUALIFICATION',
          severity: 'CRITICAL',
          message: 'User is missing a required qualification',
          qualificationId: 'qual-1',
          qualificationName: 'CPR',
        },
        {
          code: 'MISSING_OPTIONAL_QUALIFICATION',
          severity: 'WARNING',
          message: 'User is missing an optional qualification',
          qualificationId: 'qual-2',
          qualificationName: 'Radio',
        },
        {
          code: 'UNAVAILABLE_FOR_TIME_WINDOW',
          severity: 'WARNING',
          message: 'User is not available for this task time',
        },
      ],
    });
  });

  it('evaluateCandidate: rejects users outside the task company', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue({
      id: 'instance-1',
      startTime: new Date('2026-01-01T09:00:00.000Z'),
      activityTask: { id: 'task-1', activity: { id: 'activity-1', companyId: 'company-1' } },
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      companyId: 'company-2',
      userRoles: [],
      userQualifications: [],
    });

    await expect(service.evaluateCandidate('instance-1', 'user-1')).rejects.toThrow(BadRequestException);
  });
});
