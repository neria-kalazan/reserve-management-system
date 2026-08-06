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
});
