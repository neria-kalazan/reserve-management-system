import { QualificationsService } from './qualifications.service';
import { createPrismaMock } from '../../test/prisma.mock';

describe('QualificationsService', () => {
  let prisma: any;
  let service: QualificationsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new QualificationsService(prisma);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create: upserts qualification', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.qualification.create.mockResolvedValue({ id: 'q1', name: 'חובש' });
    const res = await service.create('c1', { name: 'חובש' } as any);
    expect(res).toBeDefined();
  });
});
