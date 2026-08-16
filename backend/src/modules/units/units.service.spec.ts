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
