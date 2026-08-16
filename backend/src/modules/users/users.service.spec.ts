import { validate } from 'class-validator';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { createPrismaMock, prismaClientKnownRequestError } from '../../test/prisma.mock';
import { FindCompanyUsersQueryDto } from './dto/find-company-users-query.dto';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let prisma: any;
  let service: UsersService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new UsersService(prisma);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create: creates user when company and unit valid', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.unit.findUnique.mockResolvedValue({ id: 'u1', companyId: 'c1' });
    prisma.user.create.mockResolvedValue({ id: 'user1', firstName: 'A' });

    const res = await service.create('c1', {
      unitId: 'u1',
      firstName: 'A',
      lastName: 'B',
      phone: '050',
      personalNumber: 'p1',
    } as any);

    expect(res).toBeDefined();
    expect(prisma.user.create).toHaveBeenCalled();
  });

  it('create: missing company throws NotFoundException', async () => {
    prisma.company.findUnique.mockResolvedValue(null);
    await expect(service.create('c1', { unitId: 'u1' } as any)).rejects.toThrow(NotFoundException);
  });

  it('create: unit not belonging to company throws BadRequestException', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.unit.findUnique.mockResolvedValue({ id: 'u1', companyId: 'other' });
    await expect(service.create('c1', { unitId: 'u1' } as any)).rejects.toThrow(BadRequestException);
  });

  it('create: duplicate personalNumber throws ConflictException', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.unit.findUnique.mockResolvedValue({ id: 'u1', companyId: 'c1' });
    prisma.user.create.mockImplementation(() => {
      throw prismaClientKnownRequestError('P2002');
    });

    await expect(service.create('c1', { unitId: 'u1', firstName: 'A', lastName: 'B', phone: '050', personalNumber: 'p1' } as any)).rejects.toThrow(ConflictException);
  });

  it('findAllByCompany: defaults to active records, first page and firstName asc sort', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.user.findMany.mockResolvedValue([{ id: 'u1', firstName: 'Ada', lastName: 'Lovelace', personalNumber: 'P-1', phone: '050', email: null, isActive: true, createdAt: '2025-01-01T00:00:00.000Z', unit: null, userRoles: [{ role: { id: 'r1', name: 'מנהל' } }, { role: { id: 'r2', name: 'חובש' } }], userQualifications: [{ qualification: { id: 'q1', name: 'נשק' } }, { qualification: { id: 'q2', name: 'חובש' } }] }]);
    prisma.user.count.mockResolvedValue(1);

    const res = await service.findAllByCompany('c1');

    expect(prisma.company.findUnique).toHaveBeenCalledWith({ where: { id: 'c1' }, select: { id: true } });
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { companyId: 'c1', isActive: true },
      orderBy: { firstName: 'asc' },
      skip: 0,
      take: 10,
      select: expect.objectContaining({
        id: true,
        firstName: true,
        personalNumber: true,
        userRoles: expect.any(Object),
        userQualifications: expect.any(Object),
      }),
    });
    expect(prisma.user.count).toHaveBeenCalledWith({ where: { companyId: 'c1', isActive: true } });
    expect(res).toEqual({
      items: [{ id: 'u1', firstName: 'Ada', lastName: 'Lovelace', personalNumber: 'P-1', phone: '050', email: null, isActive: true, createdAt: '2025-01-01T00:00:00.000Z', unit: null, userRoles: [{ role: { id: 'r1', name: 'מנהל' } }, { role: { id: 'r2', name: 'חובש' } }], userQualifications: [{ qualification: { id: 'q1', name: 'נשק' } }, { qualification: { id: 'q2', name: 'חובש' } }], roles: [{ id: 'r1', name: 'מנהל' }, { id: 'r2', name: 'חובש' }], qualifications: [{ id: 'q1', name: 'נשק' }, { id: 'q2', name: 'חובש' }] }],
      total: 1,
      page: 1,
      pageSize: 10,
    });
  });

  it('findAllByCompany: applies custom page, pageSize and sort order', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.count.mockResolvedValue(25);

    await service.findAllByCompany('c1', { page: 2, pageSize: 5, sortBy: 'lastName', sortOrder: 'desc' });

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { companyId: 'c1', isActive: true },
      orderBy: { lastName: 'desc' },
      skip: 5,
      take: 5,
      select: expect.objectContaining({ id: true }),
    });
    expect(prisma.user.count).toHaveBeenCalledWith({ where: { companyId: 'c1', isActive: true } });
  });

  it('findAllByCompany: throws when the company does not exist', async () => {
    prisma.company.findUnique.mockResolvedValue(null);

    await expect(service.findAllByCompany('missing-company')).rejects.toThrow(NotFoundException);
  });

  it('findAllByCompany: validates supported sort fields and numeric query params', async () => {
    const dto = new FindCompanyUsersQueryDto();
    dto.page = 0;
    dto.pageSize = 0;
    dto.sortBy = 'email' as any;
    dto.sortOrder = 'sideways' as any;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('update: deactivates an existing user without deleting the record', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user1', companyId: 'c1', unitId: 'u1' });
    prisma.user.update.mockResolvedValue({
      id: 'user1',
      firstName: 'A',
      lastName: 'B',
      phone: '050',
      email: null,
      personalNumber: 'p1',
      isActive: false,
      company: { id: 'c1', name: 'Company' },
      unit: { id: 'u1', name: 'Team', description: null, displayOrder: 1 },
    });

    const res = await service.update('user1', { isActive: false } as any);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user1' }, select: { id: true, companyId: true, unitId: true } });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user1' },
      data: { isActive: false },
      select: expect.objectContaining({
        id: true,
        isActive: true,
      }),
    });
    expect(res.isActive).toBe(false);
  });

  it('update: throws when user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.update('missing-user', { isActive: false } as any)).rejects.toThrow('User not found');
  });
});
