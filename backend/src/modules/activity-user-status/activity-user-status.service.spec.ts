import { NotFoundException } from '@nestjs/common';
import { ActivityUserStatusService } from './activity-user-status.service';
import { createPrismaMock } from '../../test/prisma.mock';

describe('ActivityUserStatusService', () => {
  let prisma: any;
  let service: ActivityUserStatusService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new ActivityUserStatusService(prisma);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findAllByActivity: returns availability records with user info', async () => {
    const records = [
      {
        id: 's1',
        activityId: 'a1',
        userId: 'u1',
        date: new Date('2026-01-01'),
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'u1',
          firstName: 'John',
          lastName: 'Doe',
          phone: '0500000000',
          email: 'john@example.com',
          personalNumber: '12345',
          isActive: true,
        },
      },
    ];

    prisma.activity.findUnique.mockResolvedValue({ id: 'a1' });
    prisma.activityUserStatus.findMany.mockResolvedValue(records);

    const res = await service.findAllByActivity('a1');

    expect(res).toEqual(records);
    expect(prisma.activityUserStatus.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { activityId: 'a1' },
      }),
    );
  });

  it('findAllByActivity: throws when activity missing', async () => {
    prisma.activity.findUnique.mockResolvedValue(null);

    await expect(service.findAllByActivity('a1')).rejects.toThrow(NotFoundException);
  });
});
