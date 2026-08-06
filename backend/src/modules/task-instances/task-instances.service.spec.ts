import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TaskInstancesService } from './task-instances.service';
import { createPrismaMock } from '../../test/prisma.mock';

describe('TaskInstancesService', () => {
  let prisma: any;
  let service: TaskInstancesService;

  beforeEach(() => {
    prisma = createPrismaMock();
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
});
