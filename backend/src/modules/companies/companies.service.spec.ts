import { CompaniesService } from './companies.service';
import { createPrismaMock } from '../../test/prisma.mock';

describe('CompaniesService', () => {
  let prisma: any;
  let service: CompaniesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new CompaniesService(prisma);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create: creates when no ownerUserId', async () => {
    prisma.company.create.mockResolvedValue({ id: 'c1', name: 'X' });
    const res = await service.create({ name: 'X' } as any);
    expect(res).toBeDefined();
    expect(prisma.company.create).toHaveBeenCalled();
  });
});
