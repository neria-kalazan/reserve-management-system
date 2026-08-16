import { RolesService } from './roles.service';
import { createPrismaMock } from '../../test/prisma.mock';

describe('RolesService', () => {
  let prisma: any;
  let service: RolesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new RolesService(prisma);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create: upserts role', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.role.create.mockResolvedValue({ id: 'r1', name: 'מ"פ' });
    const res = await service.create('c1', { name: 'מ"פ' } as any);
    expect(res).toBeDefined();
  });

  it('delete: removes an existing role', async () => {
    prisma.role.findUnique.mockResolvedValue({ id: 'r1', companyId: 'c1', name: 'מ"פ' });
    prisma.role.delete.mockResolvedValue({ id: 'r1', companyId: 'c1', name: 'מ"פ' });

    const res = await service.delete('r1');

    expect(prisma.role.findUnique).toHaveBeenCalledWith({ where: { id: 'r1' } });
    expect(prisma.role.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
    expect(res).toMatchObject({ id: 'r1', name: 'מ"פ' });
  });

  it('delete: throws when role does not exist', async () => {
    prisma.role.findUnique.mockResolvedValue(null);

    await expect(service.delete('missing-role')).rejects.toThrow('Role not found');
  });
});
