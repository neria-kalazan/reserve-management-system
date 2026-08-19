import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { createPrismaMock } from '../../test/prisma.mock';

describe('ActivitiesService', () => {
  let prisma: any;
  let service: ActivitiesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new ActivitiesService(prisma);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create: creates activity with required type when company exists', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.activity.create.mockResolvedValue({ id: 'a1', companyId: 'c1', type: 'TRAINING', status: 'DRAFT' });

    const res = await service.create('c1', { name: 'Ops', startDate: '2026-01-01', endDate: '2026-01-02', type: 'TRAINING' } as any);

    expect(res).toBeDefined();
    expect(prisma.activity.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: 'TRAINING' }),
    }));
  });

  it('create: rejects invalid company', async () => {
    prisma.company.findUnique.mockResolvedValue(null);

    await expect(service.create('c1', { name: 'Ops', startDate: '2026-01-01', endDate: '2026-01-02' } as any)).rejects.toThrow(NotFoundException);
  });

  it('create: rejects endDate before startDate', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'c1' });

    await expect(service.create('c1', { name: 'Ops', startDate: '2026-01-03', endDate: '2026-01-02' } as any)).rejects.toThrow(BadRequestException);
  });

  it('findAllByCompany: throws when company missing', async () => {
    prisma.company.findUnique.mockResolvedValue(null);

    await expect(service.findAllByCompany('c1')).rejects.toThrow(NotFoundException);
  });

  it('findOne: throws when activity missing', async () => {
    prisma.activity.findUnique.mockResolvedValue(null);

    await expect(service.findOne('a1')).rejects.toThrow(NotFoundException);
  });

  it('update: updates status and preserves date validation', async () => {
    prisma.activity.findUnique.mockResolvedValue({ id: 'a1', startDate: new Date('2026-01-01'), endDate: new Date('2026-01-02') });
    prisma.activity.update.mockResolvedValue({ id: 'a1', status: 'ACTIVE' });

    await expect(service.update('a1', { status: 'ACTIVE' } as any)).resolves.toBeDefined();
    expect(prisma.activity.update).toHaveBeenCalled();
  });
});
