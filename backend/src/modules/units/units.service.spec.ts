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
});
