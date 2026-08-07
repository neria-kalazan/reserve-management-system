import { BadRequestException } from '@nestjs/common';
import { CompanyDashboardService } from './company-dashboard.service';
import { createPrismaMock } from '../../test/prisma.mock';

describe('CompanyDashboardService', () => {
  let prisma: any;
  let validationService: { validate: jest.Mock };
  let service: CompanyDashboardService;

  beforeEach(() => {
    prisma = createPrismaMock();
    validationService = { validate: jest.fn().mockResolvedValue({ requiredErrors: [], warnings: [], summary: { isValid: true } }) };
    service = new CompanyDashboardService(prisma, validationService as any);
  });

  it('returns the active activity when one exists', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'company-1' });
    prisma.activity.findMany.mockResolvedValue([{ id: 'activity-1', name: 'Ops', startDate: new Date('2026-01-01T00:00:00.000Z'), endDate: new Date('2026-01-03T00:00:00.000Z'), status: 'ACTIVE' }]);
    prisma.user.count.mockResolvedValue(4);
    prisma.activityUserStatus.findMany.mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }, { userId: 'u3' }]);
    prisma.activityUserStatus.groupBy.mockResolvedValue([]);
    prisma.taskInstance.findMany.mockResolvedValue([{ id: 'instance-1' }]);
    prisma.assignment.findMany.mockResolvedValue([]);

    const result = await service.getDashboard('company-1');

    expect(result.activeActivity).not.toBeNull();
    expect(result.activeActivity?.numberOfDays).toBe(3);
    expect(result.manpowerSummary.totalActiveUsers).toBe(4);
  });

  it('returns no active activity when none exists', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'company-1' });
    prisma.activity.findMany.mockResolvedValue([]);
    prisma.user.count.mockResolvedValue(0);
    prisma.activityUserStatus.findMany.mockResolvedValue([]);
    prisma.activityUserStatus.groupBy.mockResolvedValue([]);
    prisma.taskInstance.findMany.mockResolvedValue([]);
    prisma.assignment.findMany.mockResolvedValue([]);

    const result = await service.getDashboard('company-1');

    expect(result.activeActivity).toBeNull();
    expect(result.manpowerSummary.totalActiveUsers).toBe(0);
  });

  it('throws when multiple active activities exist', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'company-1' });
    prisma.activity.findMany.mockResolvedValue([
      { id: 'activity-1', name: 'A', startDate: new Date('2026-01-01'), endDate: new Date('2026-01-02'), status: 'ACTIVE' },
      { id: 'activity-2', name: 'B', startDate: new Date('2026-01-03'), endDate: new Date('2026-01-04'), status: 'ACTIVE' },
    ]);

    await expect(service.getDashboard('company-1')).rejects.toThrow(BadRequestException);
  });

  it('builds manpower summary from the current activity', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'company-1' });
    prisma.activity.findMany.mockResolvedValue([{ id: 'activity-1', name: 'Ops', startDate: new Date('2026-01-01'), endDate: new Date('2026-01-02'), status: 'ACTIVE' }]);
    prisma.user.count.mockResolvedValue(2);
    prisma.activityUserStatus.findMany.mockResolvedValue([{ userId: 'u1', status: 'ACTIVE', availability: 'ALL_DAY' }, { userId: 'u2', status: 'SICK', availability: 'MORNING' }]);
    prisma.activityUserStatus.groupBy.mockResolvedValue([
      { status: 'ACTIVE', _count: { _all: 1 } },
      { status: 'SICK', _count: { _all: 1 } },
    ]);
    prisma.taskInstance.findMany.mockResolvedValue([]);
    prisma.assignment.findMany.mockResolvedValue([]);

    const result = await service.getDashboard('company-1');

    expect(result.manpowerSummary.usersParticipatingInActivity).toBe(2);
    expect(result.manpowerSummary.todayAvailabilitySummary.statusCounts.ACTIVE).toBe(1);
  });

  it('builds tasks summary and validation issues', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'company-1' });
    prisma.activity.findMany.mockResolvedValue([{ id: 'activity-1', name: 'Ops', startDate: new Date('2026-01-01'), endDate: new Date('2026-01-02'), status: 'ACTIVE' }]);
    prisma.user.count.mockResolvedValue(1);
    prisma.activityUserStatus.findMany.mockResolvedValue([]);
    prisma.activityUserStatus.groupBy.mockResolvedValue([]);
    prisma.taskInstance.findMany.mockResolvedValue([{ id: 'instance-1' }, { id: 'instance-2' }]);
    prisma.assignment.findMany.mockResolvedValue([{ taskInstanceId: 'instance-1', userId: 'u1' }]);
    validationService.validate.mockResolvedValueOnce({ requiredErrors: [{ type: 'MANPOWER', message: 'Missing required manpower' }], warnings: [{ type: 'ROLE', message: 'Optional role requirement is missing' }], summary: { isValid: false } });
    validationService.validate.mockResolvedValueOnce({ requiredErrors: [], warnings: [], summary: { isValid: true } });

    const result = await service.getDashboard('company-1');

    expect(result.tasksSummary.totalTaskInstances).toBe(2);
    expect(result.tasksSummary.unassignedTaskInstances).toBe(1);
    expect(result.validationIssues.requiredErrorCount).toBe(1);
    expect(result.validationIssues.warningCount).toBe(1);
  });

  it('returns empty summaries when there is no active activity', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'company-1' });
    prisma.activity.findMany.mockResolvedValue([]);
    prisma.user.count.mockResolvedValue(0);
    prisma.activityUserStatus.findMany.mockResolvedValue([]);
    prisma.activityUserStatus.groupBy.mockResolvedValue([]);
    prisma.taskInstance.findMany.mockResolvedValue([]);
    prisma.assignment.findMany.mockResolvedValue([]);

    const result = await service.getDashboard('company-1');

    expect(result.activeActivity).toBeNull();
    expect(result.tasksSummary.totalTaskInstances).toBe(0);
    expect(result.validationIssues.issues).toEqual([]);
  });
});
