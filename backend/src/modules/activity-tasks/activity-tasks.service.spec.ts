import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ActivityTasksService } from './activity-tasks.service';
import { createPrismaMock } from '../../test/prisma.mock';

describe('ActivityTasksService', () => {
  let prisma: any;
  let service: ActivityTasksService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new ActivityTasksService(prisma);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create: creates task when activity exists and is not cancelled', async () => {
    prisma.activity.findUnique.mockResolvedValue({ id: 'a1', status: 'ACTIVE' });
    prisma.activityTask.create.mockResolvedValue({ id: 't1', activityId: 'a1', name: 'Task' });

    const res = await service.create('a1', { name: 'Task' } as any);

    expect(res).toBeDefined();
    expect(prisma.activityTask.create).toHaveBeenCalled();
  });

  it('create: rejects cancelled activity', async () => {
    prisma.activity.findUnique.mockResolvedValue({ id: 'a1', status: 'CANCELLED' });

    await expect(service.create('a1', { name: 'Task' } as any)).rejects.toThrow(BadRequestException);
  });

  it('create: rejects missing activity', async () => {
    prisma.activity.findUnique.mockResolvedValue(null);

    await expect(service.create('a1', { name: 'Task' } as any)).rejects.toThrow(NotFoundException);
  });

  it('findAllByActivity: throws when activity missing', async () => {
    prisma.activity.findUnique.mockResolvedValue(null);

    await expect(service.findAllByActivity('a1')).rejects.toThrow(NotFoundException);
  });

  it('findOne: throws when task missing', async () => {
    prisma.activityTask.findUnique.mockResolvedValue(null);

    await expect(service.findOne('t1')).rejects.toThrow(NotFoundException);
  });

  it('update: updates name and description', async () => {
    prisma.activityTask.findUnique.mockResolvedValue({ id: 't1', name: 'Old', description: null });
    prisma.activityTask.update.mockResolvedValue({ id: 't1', name: 'New', description: 'Updated' });

    await expect(service.update('t1', { name: 'New', description: 'Updated' } as any)).resolves.toBeDefined();
    expect(prisma.activityTask.update).toHaveBeenCalled();
  });
});
