import { CompanyDashboardService } from './company-dashboard.service';
import { createPrismaMock } from '../../test/prisma.mock';

describe('CompanyDashboardService', () => {
  let prisma: any;
  let service: CompanyDashboardService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new CompanyDashboardService(prisma);
  });

  it('returns the company soldier summary and activity windows', async () => {
    const now = new Date('2026-08-16T12:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);

    prisma.company.findUnique.mockResolvedValue({ id: 'company-1' });
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', isActive: true, userRoles: [{ roleId: 'role-1' }], userQualifications: [{ qualificationId: 'qual-1' }] },
      { id: 'u2', isActive: true, userRoles: [{ roleId: 'role-1' }, { roleId: 'role-2' }], userQualifications: [{ qualificationId: 'qual-1' }, { qualificationId: 'qual-2' }] },
      { id: 'u3', isActive: false, userRoles: [{ roleId: 'role-2' }], userQualifications: [] },
    ]);
    prisma.role.findMany.mockResolvedValue([
      { id: 'role-1', name: 'מ"פ' },
      { id: 'role-2', name: 'קצין' },
    ]);
    prisma.qualification.findMany.mockResolvedValue([
      { id: 'qual-1', name: 'רופא' },
      { id: 'qual-2', name: 'נווט' },
    ]);
    prisma.activity.findMany.mockResolvedValue([
      { id: 'a1', name: 'תרגיל קרוב', startDate: new Date('2026-08-18T00:00:00.000Z'), endDate: new Date('2026-08-20T00:00:00.000Z'), status: 'ACTIVE' },
      { id: 'a2', name: 'תרגיל אחרון', startDate: new Date('2026-08-01T00:00:00.000Z'), endDate: new Date('2026-08-03T00:00:00.000Z'), status: 'COMPLETED' },
      { id: 'a3', name: 'לא רלוונטי', startDate: new Date('2026-08-30T00:00:00.000Z'), endDate: new Date('2026-08-31T00:00:00.000Z'), status: 'DRAFT' },
    ]);

    const result = await service.getDashboard('company-1');

    expect(result.companySummary.totalSoldiers).toBe(2);
    expect(result.companySummary.roleCounts).toEqual([
      { name: 'מ"פ', count: 2 },
      { name: 'קצין', count: 1 },
    ]);
    expect(result.companySummary.qualificationCounts).toEqual([
      { name: 'רופא', count: 2 },
      { name: 'נווט', count: 1 },
    ]);
    expect(result.upcomingActivities).toHaveLength(2);
    expect(result.recentActivities).toHaveLength(1);
    expect(result.upcomingActivities[0].name).toBe('תרגיל קרוב');
    expect(result.recentActivities[0].name).toBe('תרגיל אחרון');

    jest.useRealTimers();
  });

  it('returns empty summaries when the company has no data', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'company-1' });
    prisma.user.findMany.mockResolvedValue([]);
    prisma.role.findMany.mockResolvedValue([]);
    prisma.qualification.findMany.mockResolvedValue([]);
    prisma.activity.findMany.mockResolvedValue([]);

    const result = await service.getDashboard('company-1');

    expect(result.companySummary).toEqual({
      totalSoldiers: 0,
      qualificationCounts: [],
      roleCounts: [],
    });
    expect(result.upcomingActivities).toEqual([]);
    expect(result.recentActivities).toEqual([]);
  });
});
