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

  it('delete: removes an existing qualification', async () => {
    prisma.qualification.findUnique.mockResolvedValue({ id: 'q1', companyId: 'c1', name: 'חובש' });
    prisma.qualification.delete.mockResolvedValue({ id: 'q1', companyId: 'c1', name: 'חובש' });

    const res = await service.delete('q1');

    expect(prisma.qualification.findUnique).toHaveBeenCalledWith({ where: { id: 'q1' } });
    expect(prisma.qualification.delete).toHaveBeenCalledWith({ where: { id: 'q1' } });
    expect(res).toMatchObject({ id: 'q1', name: 'חובש' });
  });

  it('delete: throws when qualification does not exist', async () => {
    prisma.qualification.findUnique.mockResolvedValue(null);

    await expect(service.delete('missing-qualification')).rejects.toThrow('Qualification not found');
  });
});
