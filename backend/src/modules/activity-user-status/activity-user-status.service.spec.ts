import { BadRequestException, NotFoundException } from '@nestjs/common';
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

  it('generateAvailability: creates records for active users', async () => {
    prisma.activity.findUnique.mockResolvedValue({ id: 'a1', companyId: 'c1', startDate: new Date('2026-01-01'), endDate: new Date('2026-01-02') });
    prisma.user.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
    prisma.$transaction.mockImplementation(async (callback: any) => callback(prisma));
    prisma.activityUserStatus.create.mockResolvedValue({ activityId: 'a1', userId: 'u1', date: new Date('2026-01-01'), status: 'ACTIVE' });

    const res = await service.generateAvailability('a1');

    expect(res).toBeDefined();
    expect(prisma.activityUserStatus.create).toHaveBeenCalled();
  });

  it('generateAvailability: ignores inactive users', async () => {
    prisma.activity.findUnique.mockResolvedValue({ id: 'a1', companyId: 'c1', startDate: new Date('2026-01-01'), endDate: new Date('2026-01-01') });
    prisma.user.findMany.mockResolvedValue([{ id: 'u1' }]);
    prisma.$transaction.mockImplementation(async (callback: any) => callback(prisma));
    prisma.activityUserStatus.create.mockResolvedValue({ activityId: 'a1', userId: 'u1', date: new Date('2026-01-01'), status: 'ACTIVE' });

    await service.generateAvailability('a1');

    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { companyId: 'c1', isActive: true } }));
  });

  it('generateAvailability: prevents duplicates', async () => {
    prisma.activity.findUnique.mockResolvedValue({ id: 'a1', companyId: 'c1', startDate: new Date('2026-01-01'), endDate: new Date('2026-01-01') });
    prisma.user.findMany.mockResolvedValue([{ id: 'u1' }]);
    prisma.$transaction.mockImplementation(async (callback: any) => callback(prisma));
    prisma.activityUserStatus.create.mockRejectedValueOnce({ code: 'P2002' }).mockResolvedValue({ activityId: 'a1', userId: 'u1', date: new Date('2026-01-01'), status: 'ACTIVE' });

    const res = await service.generateAvailability('a1');

    expect(res).toEqual([]);
  });

  it('update: updates status successfully', async () => {
    const existing = {
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
    };

    prisma.activityUserStatus.findUnique.mockResolvedValue(existing);
    prisma.activityUserStatus.update.mockResolvedValue({ ...existing, status: 'HOLIDAY' });

    const res = await service.update('s1', { status: 'HOLIDAY' as any });

    expect(res.status).toBe('HOLIDAY');
    expect(prisma.activityUserStatus.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 's1' },
        data: { status: 'HOLIDAY' },
      }),
    );
  });

  it('bulkUpdate: updates multiple records', async () => {
    prisma.activity.findUnique.mockResolvedValue({ id: 'a1', companyId: 'c1' });
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', companyId: 'c1' });
    prisma.activityUserStatus.findMany.mockResolvedValue([
      { id: 's1', activityId: 'a1', userId: 'u1', date: new Date('2026-01-01'), status: 'ACTIVE' },
      { id: 's2', activityId: 'a1', userId: 'u1', date: new Date('2026-01-02'), status: 'ACTIVE' },
    ]);
    prisma.$transaction.mockImplementation(async (callback: any) => callback(prisma));
    prisma.activityUserStatus.update.mockResolvedValue({ id: 's1', status: 'HOLIDAY' });

    const res = await service.bulkUpdate('a1', {
      userId: 'u1',
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      status: 'HOLIDAY' as any,
    });

    expect(res.updatedCount).toBe(2);
    expect(prisma.activityUserStatus.update).toHaveBeenCalledTimes(2);
  });

  it('bulkUpdate: rejects user from another company', async () => {
    prisma.activity.findUnique.mockResolvedValue({ id: 'a1', companyId: 'c1' });
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', companyId: 'c2' });

    await expect(
      service.bulkUpdate('a1', {
        userId: 'u1',
        startDate: '2026-01-01',
        endDate: '2026-01-02',
        status: 'HOLIDAY' as any,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('bulkUpdate: rejects invalid range', async () => {
    prisma.activity.findUnique.mockResolvedValue({ id: 'a1', companyId: 'c1' });

    await expect(
      service.bulkUpdate('a1', {
        userId: 'u1',
        startDate: '2026-01-03',
        endDate: '2026-01-01',
        status: 'HOLIDAY' as any,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('update: throws when record missing', async () => {
    prisma.activityUserStatus.findUnique.mockResolvedValue(null);

    await expect(service.update('s1', { status: 'HOLIDAY' as any })).rejects.toThrow(NotFoundException);
  });

  it('update: rejects invalid status', async () => {
    prisma.activityUserStatus.findUnique.mockResolvedValue({ id: 's1' });

    await expect(service.update('s1', { status: 'INVALID' as any })).rejects.toThrow(BadRequestException);
  });

  it('findAllByActivity: throws when activity missing', async () => {
    prisma.activity.findUnique.mockResolvedValue(null);

    await expect(service.findAllByActivity('a1')).rejects.toThrow(NotFoundException);
  });
});
