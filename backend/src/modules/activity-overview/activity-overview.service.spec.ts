import { NotFoundException } from '@nestjs/common';
import { ActivityOverviewService } from './activity-overview.service';
import { createPrismaMock } from '../../test/prisma.mock';

describe('ActivityOverviewService', () => {
  let prisma: any;
  let validationService: { validate: jest.Mock };
  let service: ActivityOverviewService;

  beforeEach(() => {
    prisma = createPrismaMock();
    validationService = {
      validate: jest.fn().mockResolvedValue({ requiredErrors: [], warnings: [], summary: { isValid: true } }),
    };
    service = new ActivityOverviewService(prisma, validationService as any);
  });

  it('returns the activity overview when the activity exists', async () => {
    prisma.activity.findUnique.mockResolvedValue({
      id: 'activity-1',
      name: 'Ops',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2026-01-03T00:00:00.000Z'),
      status: 'ACTIVE',
      company: { id: 'company-1', name: 'Reserve Co', status: 'ACTIVE' },
    });
    prisma.activityUserStatus.findMany.mockResolvedValue([
      { userId: 'u1', status: 'ACTIVE', availability: 'ALL_DAY' },
      { userId: 'u2', status: 'SICK', availability: 'MORNING' },
    ]);
    prisma.activityTask.findMany.mockResolvedValue([{ id: 'task-1', name: 'Setup' }]);
    prisma.taskInstance.findMany.mockResolvedValue([{ id: 'instance-1', title: 'Morning shift', activityTaskId: 'task-1' }]);
    prisma.assignment.findMany.mockResolvedValue([{ taskInstanceId: 'instance-1', userId: 'u1' }]);

    const result = await service.getOverview('activity-1');

    expect(result.activity.id).toBe('activity-1');
    expect(result.manpowerSummary.participantCount).toBe(2);
    expect(result.tasksOverview[0].taskName).toBe('Setup');
    expect(result.availabilitySummary.byAvailability.ALL_DAY).toBe(1);
  });

  it('throws when the activity is missing', async () => {
    prisma.activity.findUnique.mockResolvedValue(null);

    await expect(service.getOverview('activity-404')).rejects.toThrow(NotFoundException);
  });

  it('builds manpower summary from activity user statuses', async () => {
    prisma.activity.findUnique.mockResolvedValue({ id: 'activity-1', name: 'Ops', startDate: new Date(), endDate: new Date(), status: 'ACTIVE', company: { id: 'c1', name: 'Co', status: 'ACTIVE' } });
    prisma.activityUserStatus.findMany.mockResolvedValue([
      { userId: 'u1', status: 'ACTIVE', availability: 'ALL_DAY' },
      { userId: 'u2', status: 'HOLIDAY', availability: 'EVENING' },
    ]);
    prisma.activityTask.findMany.mockResolvedValue([]);
    prisma.taskInstance.findMany.mockResolvedValue([]);
    prisma.assignment.findMany.mockResolvedValue([]);

    const result = await service.getOverview('activity-1');

    expect(result.manpowerSummary.dailyStatusSummary.ACTIVE).toBe(1);
    expect(result.manpowerSummary.dailyStatusSummary.HOLIDAY).toBe(1);
  });

  it('summarizes task assignments', async () => {
    prisma.activity.findUnique.mockResolvedValue({ id: 'activity-1', name: 'Ops', startDate: new Date(), endDate: new Date(), status: 'ACTIVE', company: { id: 'c1', name: 'Co', status: 'ACTIVE' } });
    prisma.activityUserStatus.findMany.mockResolvedValue([]);
    prisma.activityTask.findMany.mockResolvedValue([{ id: 'task-1', name: 'Setup' }]);
    prisma.taskInstance.findMany.mockResolvedValue([
      { id: 'instance-1', title: 'Morning shift', activityTaskId: 'task-1' },
      { id: 'instance-2', title: 'Evening shift', activityTaskId: 'task-1' },
    ]);
    prisma.assignment.findMany.mockResolvedValue([{ taskInstanceId: 'instance-1', userId: 'u1' }, { taskInstanceId: 'instance-1', userId: 'u2' }]);

    const result = await service.getOverview('activity-1');

    expect(result.tasksOverview[0].assignmentSummary.totalAssignments).toBe(2);
    expect(result.tasksOverview[0].assignmentSummary.unassignedTaskInstances).toBe(1);
  });

  it('aggregates availability information', async () => {
    prisma.activity.findUnique.mockResolvedValue({ id: 'activity-1', name: 'Ops', startDate: new Date(), endDate: new Date(), status: 'ACTIVE', company: { id: 'c1', name: 'Co', status: 'ACTIVE' } });
    prisma.activityUserStatus.findMany.mockResolvedValue([
      { userId: 'u1', status: 'ACTIVE', availability: 'ALL_DAY' },
      { userId: 'u2', status: 'ACTIVE', availability: 'MORNING' },
      { userId: 'u3', status: 'SICK', availability: 'UNAVAILABLE' },
    ]);
    prisma.activityTask.findMany.mockResolvedValue([]);
    prisma.taskInstance.findMany.mockResolvedValue([]);
    prisma.assignment.findMany.mockResolvedValue([]);

    const result = await service.getOverview('activity-1');

    expect(result.availabilitySummary.byAvailability.ALL_DAY).toBe(1);
    expect(result.availabilitySummary.byAvailability.MORNING).toBe(1);
    expect(result.availabilitySummary.byAvailability.UNAVAILABLE).toBe(1);
  });

  it('returns empty task overview for activities without tasks', async () => {
    prisma.activity.findUnique.mockResolvedValue({ id: 'activity-1', name: 'Ops', startDate: new Date(), endDate: new Date(), status: 'ACTIVE', company: { id: 'c1', name: 'Co', status: 'ACTIVE' } });
    prisma.activityUserStatus.findMany.mockResolvedValue([]);
    prisma.activityTask.findMany.mockResolvedValue([]);
    prisma.taskInstance.findMany.mockResolvedValue([]);
    prisma.assignment.findMany.mockResolvedValue([]);

    const result = await service.getOverview('activity-1');

    expect(result.tasksOverview).toEqual([]);
    expect(result.availabilitySummary.byAvailability).toEqual({});
  });

  it('calculates historical administrative metrics from activity user statuses', async () => {
    prisma.activity.findUnique.mockResolvedValue({ id: 'activity-1', name: 'Ops', startDate: new Date('2026-01-01T00:00:00.000Z'), endDate: new Date('2026-01-05T00:00:00.000Z'), status: 'COMPLETED', company: { id: 'c1', name: 'Co', status: 'ACTIVE' } });
    prisma.activityUserStatus.findMany.mockResolvedValue([
      { userId: 'u1', status: 'HOLIDAY', availability: 'ALL_DAY' },
      { userId: 'u1', status: 'HOLIDAY', availability: 'ALL_DAY' },
      { userId: 'u1', status: 'ACTIVE', availability: 'ALL_DAY' },
      { userId: 'u2', status: 'HOLIDAY', availability: 'ALL_DAY' },
      { userId: 'u2', status: 'HOLIDAY', availability: 'ALL_DAY' },
      { userId: 'u2', status: 'HOLIDAY', availability: 'ALL_DAY' },
      { userId: 'u2', status: 'HOLIDAY', availability: 'ALL_DAY' },
      { userId: 'u2', status: 'ACTIVE', availability: 'ALL_DAY' },
      { userId: 'u3', status: 'SICK', availability: 'ALL_DAY' },
      { userId: 'u3', status: 'RELEASED', availability: 'ALL_DAY' },
    ]);
    prisma.activityTask.findMany.mockResolvedValue([]);
    prisma.taskInstance.findMany.mockResolvedValue([]);
    prisma.assignment.findMany.mockResolvedValue([]);

    const result = await service.getOverview('activity-1');

    expect(result.averageHolidayDaysPerSoldier).toBe(2);
    expect(result.administrativeActiveDays).toBe(2);
  });

  it('uses zero when no participating soldiers exist for historical metrics', async () => {
    prisma.activity.findUnique.mockResolvedValue({ id: 'activity-1', name: 'Ops', startDate: new Date('2026-01-01T00:00:00.000Z'), endDate: new Date('2026-01-05T00:00:00.000Z'), status: 'COMPLETED', company: { id: 'c1', name: 'Co', status: 'ACTIVE' } });
    prisma.activityUserStatus.findMany.mockResolvedValue([]);
    prisma.activityTask.findMany.mockResolvedValue([]);
    prisma.taskInstance.findMany.mockResolvedValue([]);
    prisma.assignment.findMany.mockResolvedValue([]);

    const result = await service.getOverview('activity-1');

    expect(result.averageHolidayDaysPerSoldier).toBe(0);
    expect(result.administrativeActiveDays).toBe(0);
  });
});
