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
    prisma.userRole.findMany.mockResolvedValue([
      {
        userId: 'u2',
        roleId: 'role-1',
        role: { id: 'role-1', name: 'מ"פ' },
        user: {
          id: 'u2',
          firstName: 'יונתן',
          lastName: 'ישראלי',
          unit: { id: 'unit-1', name: 'מחלקה א', displayOrder: 1 },
        },
      },
      {
        userId: 'u1',
        roleId: 'role-2',
        role: { id: 'role-2', name: 'קצין' },
        user: {
          id: 'u1',
          firstName: 'שמשון',
          lastName: '',
          unit: { id: 'unit-1', name: 'מחלקה א', displayOrder: 1 },
        },
      },
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

  it('returns active role holders for the company with deterministic ordering', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'company-1' });
    prisma.userRole.findMany.mockResolvedValue([
      {
        userId: 'u-3',
        roleId: 'role-3',
        role: { id: 'role-3', name: 'נאמן כ"א' },
        user: {
          id: 'u-3',
          firstName: 'יוסי',
          lastName: 'כהן',
          unit: { id: 'unit-2', name: 'מחלקה ב', displayOrder: 10 },
        },
      },
      {
        userId: 'u-2',
        roleId: 'role-2',
        role: { id: 'role-2', name: 'מ"פ' },
        user: {
          id: 'u-2',
          firstName: 'יונתן',
          lastName: 'ישראלי',
          unit: { id: 'unit-1', name: 'מחלקה א', displayOrder: 1 },
        },
      },
      {
        userId: 'u-1',
        roleId: 'role-1',
        role: { id: 'role-1', name: 'סמ"פ' },
        user: {
          id: 'u-1',
          firstName: 'שמשון',
          lastName: '',
          unit: { id: 'unit-1', name: 'מחלקה א', displayOrder: 1 },
        },
      },
      {
        userId: 'u-2',
        roleId: 'role-4',
        role: { id: 'role-4', name: 'קצין' },
        user: {
          id: 'u-2',
          firstName: 'יונתן',
          lastName: 'ישראלי',
          unit: { id: 'unit-1', name: 'מחלקה א', displayOrder: 1 },
        },
      },
    ]);
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', isActive: true, userRoles: [{ roleId: 'role-1' }], userQualifications: [{ qualificationId: 'qual-1' }] },
      { id: 'u2', isActive: true, userRoles: [{ roleId: 'role-2' }, { roleId: 'role-4' }], userQualifications: [] },
      { id: 'u3', isActive: false, userRoles: [{ roleId: 'role-3' }], userQualifications: [] },
    ]);
    prisma.role.findMany.mockResolvedValue([
      { id: 'role-1', name: 'סמ"פ' },
      { id: 'role-2', name: 'מ"פ' },
      { id: 'role-3', name: 'נאמן כ"א' },
      { id: 'role-4', name: 'קצין' },
    ]);
    prisma.qualification.findMany.mockResolvedValue([
      { id: 'qual-1', name: 'רופא' },
    ]);
    prisma.activity.findMany.mockResolvedValue([]);

    const result = await service.getDashboard('company-1');

    expect(result.roleHolders).toEqual([
      { roleId: 'role-3', roleName: 'נאמן כ"א', holderId: 'u-3', holderFirstName: 'יוסי', holderLastName: 'כהן', unitId: 'unit-2', unitName: 'מחלקה ב', unitDisplayOrder: 10 },
      { roleId: 'role-2', roleName: 'מ"פ', holderId: 'u-2', holderFirstName: 'יונתן', holderLastName: 'ישראלי', unitId: 'unit-1', unitName: 'מחלקה א', unitDisplayOrder: 1 },
      { roleId: 'role-1', roleName: 'סמ"פ', holderId: 'u-1', holderFirstName: 'שמשון', holderLastName: '', unitId: 'unit-1', unitName: 'מחלקה א', unitDisplayOrder: 1 },
      { roleId: 'role-4', roleName: 'קצין', holderId: 'u-2', holderFirstName: 'יונתן', holderLastName: 'ישראלי', unitId: 'unit-1', unitName: 'מחלקה א', unitDisplayOrder: 1 },
    ]);
  });

  it('excludes inactive personnel and respects company scoping when returning role holders', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'company-1' });
    prisma.userRole.findMany.mockResolvedValue([
      {
        userId: 'u-1',
        roleId: 'role-1',
        role: { id: 'role-1', name: 'מ"פ' },
        user: {
          id: 'u-1',
          firstName: 'אבי',
          lastName: 'שמעוני',
          companyId: 'company-1',
          isActive: true,
          unit: { id: 'unit-1', name: 'מחלקה א', displayOrder: 2 },
        },
      },
    ]);
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', isActive: true, userRoles: [{ roleId: 'role-1' }], userQualifications: [] },
      { id: 'u2', isActive: true, userRoles: [{ roleId: 'role-2' }], userQualifications: [] },
      { id: 'u3', isActive: false, userRoles: [{ roleId: 'role-3' }], userQualifications: [] },
    ]);
    prisma.role.findMany.mockResolvedValue([]);
    prisma.qualification.findMany.mockResolvedValue([]);
    prisma.activity.findMany.mockResolvedValue([]);

    const result = await service.getDashboard('company-1');

    expect(result.roleHolders).toEqual([
      { roleId: 'role-1', roleName: 'מ"פ', holderId: 'u-1', holderFirstName: 'אבי', holderLastName: 'שמעוני', unitId: 'unit-1', unitName: 'מחלקה א', unitDisplayOrder: 2 },
    ]);
  });

  it('returns empty role holders when there are no active assignments', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'company-1' });
    prisma.userRole.findMany.mockResolvedValue([]);
    prisma.user.findMany.mockResolvedValue([]);
    prisma.role.findMany.mockResolvedValue([]);
    prisma.qualification.findMany.mockResolvedValue([]);
    prisma.activity.findMany.mockResolvedValue([]);

    const result = await service.getDashboard('company-1');

    expect(result.roleHolders).toEqual([]);
  });

  it('returns empty summaries when the company has no data', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'company-1' });
    prisma.user.findMany.mockResolvedValue([]);
    prisma.role.findMany.mockResolvedValue([]);
    prisma.qualification.findMany.mockResolvedValue([]);
    prisma.activity.findMany.mockResolvedValue([]);
    prisma.userRole.findMany.mockResolvedValue([]);

    const result = await service.getDashboard('company-1');

    expect(result.companySummary).toEqual({
      totalSoldiers: 0,
      qualificationCounts: [],
      roleCounts: [],
    });
    expect(result.upcomingActivities).toEqual([]);
    expect(result.recentActivities).toEqual([]);
    expect(result.roleHolders).toEqual([]);
  });
});
