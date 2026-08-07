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
      activityTask: { activity: { id: 'activity-1', companyId: 'company-1' } },
    });
    prisma.activityUserStatus.findMany.mockResolvedValue([
      {
        status,
        availability,
        user: { id: 'user-1', firstName: 'Ada', lastName: 'Lovelace', phone: null, email: 'ada@example.com', personalNumber: 'P1', isActive: true },
      },
    ]);
    prisma.assignment.findMany.mockResolvedValue([]);

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
      activityTask: { activity: { id: 'activity-1', companyId: 'company-1' } },
    });
    prisma.activityUserStatus.findMany.mockResolvedValue([
      { status: 'ACTIVE', availability: 'ALL_DAY', user: { id: 'user-1', firstName: 'Ada', lastName: 'Lovelace', phone: null, email: 'ada@example.com', personalNumber: 'P1', isActive: true } },
    ]);
    prisma.assignment.findMany.mockResolvedValue([{ userId: 'user-1' }]);

    const res = await service.findAvailableUsers('instance-1');

    expect(res).toEqual([]);
  });

  it('findAvailableUsers: throws when the task instance is missing', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue(null);

    await expect(service.findAvailableUsers('instance-1')).rejects.toThrow(NotFoundException);
  });
});
