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

  it('keeps the first activity date stable across UTC/local boundaries when building the matrix', async () => {
    const previousTz = process.env.TZ;
    process.env.TZ = 'Asia/Jerusalem';

    try {
      prisma.activity.findUnique.mockResolvedValue({
        id: 'a1',
        name: 'Matrix',
        companyId: 'c1',
        startDate: '2026-11-16T00:00:00.000Z',
        endDate: '2026-11-18T00:00:00.000Z',
      });
      prisma.user.findMany.mockResolvedValue([
        { id: 'u1', firstName: 'Avi', lastName: 'Cohen', personalNumber: '100', phone: '050', email: 'avi@example.com', isActive: true },
      ]);
      prisma.activityUserStatus.findMany.mockResolvedValue([
        { userId: 'u1', date: new Date('2026-11-16T00:00:00.000Z'), status: 'ACTIVE' },
        { userId: 'u1', date: new Date('2026-11-17T00:00:00.000Z'), status: 'HOLIDAY' },
      ]);

      const res = await service.getPersonnelStatusMatrix('a1', 'c1');

      expect(res.dates).toEqual(['2026-11-16', '2026-11-17', '2026-11-18']);
      expect(res.rows[0].cells['2026-11-16']).toBe('ACTIVE');
      expect(res.rows[0].cells['2026-11-17']).toBe('HOLIDAY');
      expect(res.rows[0].cells['2026-11-18']).toBeNull();
    } finally {
      process.env.TZ = previousTz;
    }
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

  it('generateAvailability: creates records for active users with ALL_DAY availability', async () => {
    prisma.activity.findUnique.mockResolvedValue({ id: 'a1', companyId: 'c1', startDate: new Date('2026-01-01'), endDate: new Date('2026-01-02') });
    prisma.user.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
    prisma.$transaction.mockImplementation(async (callback: any) => callback(prisma));
    prisma.activityUserStatus.create.mockResolvedValue({ activityId: 'a1', userId: 'u1', date: new Date('2026-01-01'), status: 'ACTIVE', availability: 'ALL_DAY' });

    await service.generateAvailability('a1');

    expect(prisma.activityUserStatus.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ACTIVE', availability: 'ALL_DAY' }),
      }),
    );
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

  it('update: updates status and availability successfully', async () => {
    const existing = {
      id: 's1',
      activityId: 'a1',
      userId: 'u1',
      date: new Date('2026-01-01'),
      status: 'ACTIVE',
      availability: 'ALL_DAY',
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
    prisma.activityUserStatus.update.mockResolvedValue({ ...existing, status: 'HOLIDAY', availability: 'MORNING' });

    const res = await service.update('s1', { status: 'HOLIDAY' as any, availability: 'MORNING' as any });

    expect(res.status).toBe('HOLIDAY');
    expect(res.availability).toBe('MORNING');
    expect(prisma.activityUserStatus.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 's1' },
        data: { status: 'HOLIDAY', availability: 'MORNING' },
      }),
    );
  });

  it('bulkUpdate: updates multiple records', async () => {
    prisma.activity.findUnique.mockResolvedValue({ id: 'a1', companyId: 'c1' });
    prisma.user.findMany.mockResolvedValue([{ id: 'u1', companyId: 'c1' }, { id: 'u2', companyId: 'c1' }]);
    prisma.activityUserStatus.findMany.mockResolvedValue([
      { id: 's1', activityId: 'a1', userId: 'u1', date: new Date('2026-01-01'), status: 'ACTIVE', availability: 'ALL_DAY' },
      { id: 's2', activityId: 'a1', userId: 'u2', date: new Date('2026-01-02'), status: 'ACTIVE', availability: 'MORNING' },
    ]);
    prisma.$transaction.mockImplementation(async (callback: any) => callback(prisma));
    prisma.activityUserStatus.update.mockResolvedValue({ id: 's1', status: 'ACTIVE', availability: 'EVENING' });

    const res = await service.bulkUpdate('a1', {
      userIds: ['u1', 'u2'],
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      availability: 'EVENING' as any,
    });

    expect(res.updatedCount).toBe(2);
    expect(prisma.activityUserStatus.update).toHaveBeenCalledTimes(2);
  });

  it('bulkUpdate: rejects invalid users', async () => {
    prisma.activity.findUnique.mockResolvedValue({ id: 'a1', companyId: 'c1' });
    prisma.user.findMany.mockResolvedValue([{ id: 'u1', companyId: 'c2' }]);

    await expect(
      service.bulkUpdate('a1', {
        userIds: ['u1'],
        startDate: '2026-01-01',
        endDate: '2026-01-02',
        availability: 'MORNING' as any,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('bulkUpdate: rejects invalid range', async () => {
    prisma.activity.findUnique.mockResolvedValue({ id: 'a1', companyId: 'c1' });

    await expect(
      service.bulkUpdate('a1', {
        userIds: ['u1'],
        startDate: '2026-01-03',
        endDate: '2026-01-01',
        availability: 'MORNING' as any,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('bulkUpdate: throws when activity missing', async () => {
    prisma.activity.findUnique.mockResolvedValue(null);

    await expect(
      service.bulkUpdate('missing', {
        userIds: ['u1'],
        startDate: '2026-01-01',
        endDate: '2026-01-02',
        availability: 'ALL_DAY' as any,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('update: throws when record missing', async () => {
    prisma.activityUserStatus.findUnique.mockResolvedValue(null);

    await expect(service.update('s1', { status: 'HOLIDAY' as any })).rejects.toThrow(NotFoundException);
  });

  it('update: rejects invalid status', async () => {
    prisma.activityUserStatus.findUnique.mockResolvedValue({ id: 's1' });

    await expect(service.update('s1', { status: 'INVALID' as any })).rejects.toThrow(BadRequestException);
  });

  it('update: rejects invalid availability', async () => {
    prisma.activityUserStatus.findUnique.mockResolvedValue({ id: 's1' });

    await expect(service.update('s1', { availability: 'INVALID' as any })).rejects.toThrow(BadRequestException);
  });

  it('createForUser: creates a status for a valid activity/user/date', async () => {
    prisma.activity.findUnique.mockResolvedValue({ id: 'a1', companyId: 'c1' });
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', companyId: 'c1' });
    prisma.activityUserStatus.create.mockResolvedValue({
      id: 's1',
      activityId: 'a1',
      userId: 'u1',
      date: new Date('2026-01-01T00:00:00.000Z'),
      status: 'ACTIVE',
      availability: 'ALL_DAY',
    });

    const res = await service.createForUser('a1', 'u1', { date: '2026-01-01', status: 'ACTIVE' as any });

    expect(res.status).toBe('ACTIVE');
    expect(prisma.activityUserStatus.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        activityId: 'a1',
        userId: 'u1',
        status: 'ACTIVE',
      }),
    }));
  });

  it('createForUser: rejects invalid status values', async () => {
    prisma.activity.findUnique.mockResolvedValue({ id: 'a1', companyId: 'c1' });
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', companyId: 'c1' });

    await expect(service.createForUser('a1', 'u1', { date: '2026-01-01', status: 'INVALID' as any })).rejects.toThrow(BadRequestException);
  });

  it('createForUser: rejects users from another company', async () => {
    prisma.activity.findUnique.mockResolvedValue({ id: 'a1', companyId: 'c1' });
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', companyId: 'c2' });

    await expect(service.createForUser('a1', 'u1', { date: '2026-01-01', status: 'ACTIVE' as any })).rejects.toThrow(BadRequestException);
  });

  it('createForUser: prevents duplicate activity/user/date records', async () => {
    prisma.activity.findUnique.mockResolvedValue({ id: 'a1', companyId: 'c1' });
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', companyId: 'c1' });
    prisma.activityUserStatus.create.mockRejectedValueOnce({ code: 'P2002' });

    await expect(service.createForUser('a1', 'u1', { date: '2026-01-01', status: 'ACTIVE' as any })).rejects.toThrow('already exists');
  });

  it('updateForUser: updates an existing status without changing availability', async () => {
    prisma.activity.findUnique.mockResolvedValue({ id: 'a1', companyId: 'c1' });
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', companyId: 'c1' });
    prisma.activityUserStatus.findUnique.mockResolvedValue({
      id: 's1',
      activityId: 'a1',
      userId: 'u1',
      date: new Date('2026-01-01T00:00:00.000Z'),
      status: 'ACTIVE',
      availability: 'ALL_DAY',
    });
    prisma.activityUserStatus.update.mockResolvedValue({
      id: 's1',
      activityId: 'a1',
      userId: 'u1',
      date: new Date('2026-01-01T00:00:00.000Z'),
      status: 'HOLIDAY',
      availability: 'ALL_DAY',
    });

    const res = await service.updateForUser('a1', 'u1', '2026-01-01', { status: 'HOLIDAY' as any });

    expect(res.status).toBe('HOLIDAY');
    expect(prisma.activityUserStatus.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 's1' },
      data: { status: 'HOLIDAY' },
    }));
  });

  it('updateForUser: normalizes timezone-offset ISO dates to the correct calendar day for the composite lookup', async () => {
    prisma.activity.findUnique.mockResolvedValue({ id: 'a1', companyId: 'c1' });
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', companyId: 'c1' });
    prisma.activityUserStatus.findUnique.mockImplementation(({ where }) => {
      expect(where.activityId_userId_date).toEqual({
        activityId: 'a1',
        userId: 'u1',
        date: new Date(Date.UTC(2026, 0, 1)),
      });

      return {
        id: 's1',
        activityId: 'a1',
        userId: 'u1',
        date: new Date(Date.UTC(2026, 0, 1)),
        status: 'ACTIVE',
        availability: 'ALL_DAY',
      };
    });
    prisma.activityUserStatus.update.mockResolvedValue({
      id: 's1',
      activityId: 'a1',
      userId: 'u1',
      date: new Date(Date.UTC(2026, 0, 1)),
      status: 'HOLIDAY',
      availability: 'ALL_DAY',
    });

    await expect(service.updateForUser('a1', 'u1', '2026-01-01T00:00:00+02:00', { status: 'HOLIDAY' as any })).resolves.toMatchObject({ status: 'HOLIDAY' });
  });

  it('updateForUser: rejects invalid status values', async () => {
    prisma.activity.findUnique.mockResolvedValue({ id: 'a1', companyId: 'c1' });
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', companyId: 'c1' });
    prisma.activityUserStatus.findUnique.mockResolvedValue({ id: 's1' });

    await expect(service.updateForUser('a1', 'u1', '2026-01-01', { status: 'INVALID' as any })).rejects.toThrow(BadRequestException);
  });

  it('deleteForUser: deletes the existing status record', async () => {
    prisma.activity.findUnique.mockResolvedValue({ id: 'a1', companyId: 'c1' });
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', companyId: 'c1' });
    prisma.activityUserStatus.findUnique.mockResolvedValue({
      id: 's1',
      activityId: 'a1',
      userId: 'u1',
      date: new Date('2026-01-01T00:00:00.000Z'),
      status: 'ACTIVE',
      availability: 'ALL_DAY',
    });
    prisma.activityUserStatus.delete.mockResolvedValue({ id: 's1' });

    await expect(service.deleteForUser('a1', 'u1', '2026-01-01')).resolves.toEqual({ id: 's1' });
  });

  it('deleteForUser: rejects missing cell following repository conventions', async () => {
    prisma.activity.findUnique.mockResolvedValue({ id: 'a1', companyId: 'c1' });
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', companyId: 'c1' });
    prisma.activityUserStatus.findUnique.mockResolvedValue(null);

    await expect(service.deleteForUser('a1', 'u1', '2026-01-01')).rejects.toThrow(NotFoundException);
  });

  it('findAllByActivity: throws when activity missing', async () => {
    prisma.activity.findUnique.mockResolvedValue(null);

    await expect(service.findAllByActivity('a1')).rejects.toThrow(NotFoundException);
  });

  it('getPersonnelStatusMatrix: returns the full inclusive date range, active rows, and null cells', async () => {
    prisma.activity.findUnique.mockResolvedValue({
      id: 'a1',
      name: 'Matrix Activity',
      companyId: 'c1',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2026-01-03T00:00:00.000Z'),
    });
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', firstName: 'Ada', lastName: 'Lovelace', personalNumber: 'P1', phone: '050', email: 'ada@test.com', isActive: true },
      { id: 'u2', firstName: 'Grace', lastName: 'Hopper', personalNumber: 'P2', phone: '051', email: 'grace@test.com', isActive: false },
      { id: 'u3', firstName: 'Linus', lastName: 'Torvalds', personalNumber: 'P3', phone: '052', email: 'linus@test.com', isActive: true },
    ]);
    prisma.activityUserStatus.findMany.mockResolvedValue([
      { userId: 'u1', date: new Date('2026-01-01T00:00:00.000Z'), status: 'ACTIVE' },
      { userId: 'u1', date: new Date('2026-01-03T00:00:00.000Z'), status: 'HOLIDAY' },
      { userId: 'u3', date: new Date('2026-01-02T00:00:00.000Z'), status: 'SICK' },
    ]);

    const res = await service.getPersonnelStatusMatrix('a1', 'c1');

    expect(res.activity.id).toBe('a1');
    expect(res.dates).toEqual(['2026-01-01', '2026-01-02', '2026-01-03']);
    expect(res.rows).toHaveLength(2);
    expect(res.rows[0].user.id).toBe('u1');
    expect(res.rows[0].cells['2026-01-02']).toBeNull();
    expect(res.rows[0].cells['2026-01-01']).toBe('ACTIVE');
    expect(res.rows[1].user.id).toBe('u3');
    expect(res.rows[1].cells['2026-01-02']).toBe('SICK');
    expect(res.rows.some((row: any) => row.user.id === 'u2')).toBe(false);
  });

  it('getPersonnelStatusMatrix: computes row and daily summaries with yamam excluding released', async () => {
    prisma.activity.findUnique.mockResolvedValue({
      id: 'a1',
      name: 'Matrix Activity',
      companyId: 'c1',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2026-01-02T00:00:00.000Z'),
    });
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', firstName: 'Ada', lastName: 'Lovelace', personalNumber: 'P1', phone: '050', email: 'ada@test.com', isActive: true },
      { id: 'u2', firstName: 'Grace', lastName: 'Hopper', personalNumber: 'P2', phone: '051', email: 'grace@test.com', isActive: true },
    ]);
    prisma.activityUserStatus.findMany.mockResolvedValue([
      { userId: 'u1', date: new Date('2026-01-01T00:00:00.000Z'), status: 'ACTIVE' },
      { userId: 'u1', date: new Date('2026-01-02T00:00:00.000Z'), status: 'HOLIDAY' },
      { userId: 'u2', date: new Date('2026-01-01T00:00:00.000Z'), status: 'RELEASED' },
      { userId: 'u2', date: new Date('2026-01-02T00:00:00.000Z'), status: 'SICK' },
    ]);

    const res = await service.getPersonnelStatusMatrix('a1', 'c1');

    const firstRow = res.rows.find((row: any) => row.user.id === 'u1');
    expect(firstRow.summary).toEqual({
      activeCount: 1,
      holidayCount: 1,
      sickCount: 0,
      releasedCount: 0,
      yamam: 2,
      complete: true,
    });
    expect(res.dailySummary).toEqual([
      { date: '2026-01-01', activeCount: 1, holidayCount: 0, sickCount: 0, releasedCount: 1, yamam: 1 },
      { date: '2026-01-02', activeCount: 0, holidayCount: 1, sickCount: 1, releasedCount: 0, yamam: 2 },
    ]);
  });

  it('getPersonnelStatusMatrix: marks rows incomplete when any date is missing', async () => {
    prisma.activity.findUnique.mockResolvedValue({
      id: 'a1',
      name: 'Matrix Activity',
      companyId: 'c1',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2026-01-03T00:00:00.000Z'),
    });
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', firstName: 'Ada', lastName: 'Lovelace', personalNumber: 'P1', phone: '050', email: 'ada@test.com', isActive: true },
    ]);
    prisma.activityUserStatus.findMany.mockResolvedValue([
      { userId: 'u1', date: new Date('2026-01-01T00:00:00.000Z'), status: 'ACTIVE' },
    ]);

    const res = await service.getPersonnelStatusMatrix('a1', 'c1');

    expect(res.rows[0].summary.complete).toBe(false);
  });

  it('getPersonnelStatusMatrix: rejects activities from another company', async () => {
    prisma.activity.findUnique.mockResolvedValue({
      id: 'a1',
      name: 'Matrix Activity',
      companyId: 'c2',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2026-01-02T00:00:00.000Z'),
    });

    await expect(service.getPersonnelStatusMatrix('a1', 'c1')).rejects.toThrow('Activity does not belong to the authenticated company');
  });
});
