import { UnitsService } from './units.service';
import { createPrismaMock } from '../../test/prisma.mock';

describe('UnitsService', () => {
  let prisma: any;
  let service: UnitsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new UnitsService(prisma);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create: upserts unit', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.unit.create.mockResolvedValue({ id: 'u1', name: 'A' });
    const res = await service.create('c1', { name: 'A' } as any);
    expect(res).toBeDefined();
  });

  it('findAllByCompany: applies default pagination and count metadata', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.unit.findMany.mockResolvedValue([
      { id: 'u1', name: 'מסגרת א', description: 'תיאור א', displayOrder: 1, createdAt: '2024-01-01T00:00:00.000Z' },
      { id: 'u2', name: 'מסגרת ב', description: 'תיאור ב', displayOrder: 2, createdAt: '2024-01-02T00:00:00.000Z' },
    ]);
    prisma.unit.count.mockResolvedValue(2);

    const result = await service.findAllByCompany('c1');

    expect(prisma.unit.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { companyId: 'c1' },
      orderBy: { displayOrder: 'asc' },
      skip: 0,
      take: 10,
    }));
    expect(result).toMatchObject({
      items: expect.any(Array),
      total: 2,
      page: 1,
      pageSize: 10,
    });
  });

  it('findAllByCompany: respects explicit page, pageSize and sortBy', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.unit.findMany.mockResolvedValue([
      { id: 'u2', name: 'מסגרת ב', description: 'תיאור ב', displayOrder: 2, createdAt: '2024-01-02T00:00:00.000Z' },
    ]);
    prisma.unit.count.mockResolvedValue(1);

    const result = await service.findAllByCompany('c1', {
      page: 2,
      pageSize: 5,
      sortBy: 'name',
      sortOrder: 'desc',
    } as any);

    expect(prisma.unit.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { companyId: 'c1' },
      orderBy: { name: 'desc' },
      skip: 5,
      take: 5,
    }));
    expect(result).toMatchObject({ total: 1, page: 2, pageSize: 5 });
  });

  it('findAllByCompany: returns empty result set without crashing', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.unit.findMany.mockResolvedValue([]);
    prisma.unit.count.mockResolvedValue(0);

    const result = await service.findAllByCompany('c1', { page: 1, pageSize: 10, sortBy: 'name', sortOrder: 'asc' } as any);

    expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 10 });
  });

  it('findAllByCompany: enforces company scoping and throws when company missing', async () => {
    prisma.company.findUnique.mockResolvedValue(null);

    await expect(service.findAllByCompany('missing-company')).rejects.toThrow('Company not found');
  });

  it('delete: removes an existing unit with no assigned personnel', async () => {
    prisma.unit.findUnique.mockResolvedValue({ id: 'u1', companyId: 'c1', name: 'מסגרת A' });
    prisma.user.count.mockResolvedValue(0);
    prisma.unit.delete.mockResolvedValue({ id: 'u1', companyId: 'c1', name: 'מסגרת A' });

    const res = await service.delete('u1');

    expect(prisma.unit.findUnique).toHaveBeenCalledWith({ where: { id: 'u1' } });
    expect(prisma.user.count).toHaveBeenCalledWith({ where: { unitId: 'u1' } });
    expect(prisma.unit.delete).toHaveBeenCalledWith({ where: { id: 'u1' } });
    expect(res).toMatchObject({ id: 'u1', name: 'מסגרת A' });
  });

  it('delete: throws when unit does not exist', async () => {
    prisma.unit.findUnique.mockResolvedValue(null);

    await expect(service.delete('missing-unit')).rejects.toThrow('Unit not found');
  });

  it('delete: throws when personnel are assigned to the unit', async () => {
    prisma.unit.findUnique.mockResolvedValue({ id: 'u1', companyId: 'c1', name: 'מסגרת A' });
    prisma.user.count.mockResolvedValue(2);

    await expect(service.delete('u1')).rejects.toThrow('לא ניתן למחוק מסגרת כשיש אנשי צוות משויכים אליה.');
    expect(prisma.unit.delete).not.toHaveBeenCalled();
  });
});
