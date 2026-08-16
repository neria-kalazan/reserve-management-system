import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { QualificationsService } from './qualifications.service';
import { FindCompanyQualificationsQueryDto } from './dto/find-company-qualifications-query.dto';
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

  it('findAllByCompany: applies default pagination and count metadata', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.qualification.findMany.mockResolvedValue([
      { id: 'q1', name: 'חובש', description: null, createdAt: '2024-01-01T00:00:00.000Z' },
      { id: 'q2', name: 'רופא', description: null, createdAt: '2024-01-02T00:00:00.000Z' },
    ]);
    prisma.qualification.count.mockResolvedValue(2);

    const result = await service.findAllByCompany('c1');

    expect(prisma.qualification.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { companyId: 'c1' },
      orderBy: { name: 'asc' },
      skip: 0,
      take: 10,
    }));
    expect(result).toEqual({
      items: [
        { id: 'q1', name: 'חובש', description: null, createdAt: '2024-01-01T00:00:00.000Z' },
        { id: 'q2', name: 'רופא', description: null, createdAt: '2024-01-02T00:00:00.000Z' },
      ],
      total: 2,
      page: 1,
      pageSize: 10,
    });
  });

  it('findAllByCompany: respects explicit page, pageSize, and sorting', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.qualification.findMany.mockResolvedValue([
      { id: 'q1', name: 'חובש', description: null, createdAt: '2024-01-01T00:00:00.000Z' },
    ]);
    prisma.qualification.count.mockResolvedValue(1);

    const result = await service.findAllByCompany('c1', {
      page: 2,
      pageSize: 25,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    expect(prisma.qualification.findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: { createdAt: 'desc' },
      skip: 25,
      take: 25,
    }));
    expect(result).toMatchObject({
      page: 2,
      pageSize: 25,
      total: 1,
    });
  });

  it('findAllByCompany: allows empty results without crashing', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.qualification.findMany.mockResolvedValue([]);
    prisma.qualification.count.mockResolvedValue(0);

    const result = await service.findAllByCompany('c1', { page: 1, pageSize: 10, sortBy: 'name', sortOrder: 'asc' });

    expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 10 });
  });

  it('findAllByCompany: rejects invalid pagination and sort values via DTO validation', async () => {
    const invalidPageDto = plainToInstance(FindCompanyQualificationsQueryDto, { page: 0, pageSize: 10, sortBy: 'name', sortOrder: 'asc' });
    const invalidPageSizeDto = plainToInstance(FindCompanyQualificationsQueryDto, { page: 1, pageSize: 0, sortBy: 'name', sortOrder: 'asc' });
    const invalidSortFieldDto = plainToInstance(FindCompanyQualificationsQueryDto, { page: 1, pageSize: 10, sortBy: 'badField', sortOrder: 'asc' });
    const invalidSortOrderDto = plainToInstance(FindCompanyQualificationsQueryDto, { page: 1, pageSize: 10, sortBy: 'name', sortOrder: 'sideways' });

    const [pageErrors, pageSizeErrors, sortFieldErrors, sortOrderErrors] = await Promise.all([
      validate(invalidPageDto),
      validate(invalidPageSizeDto),
      validate(invalidSortFieldDto),
      validate(invalidSortOrderDto),
    ]);

    expect(pageErrors.length).toBeGreaterThan(0);
    expect(pageSizeErrors.length).toBeGreaterThan(0);
    expect(sortFieldErrors.length).toBeGreaterThan(0);
    expect(sortOrderErrors.length).toBeGreaterThan(0);
  });
});
