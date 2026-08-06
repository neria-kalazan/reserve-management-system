import { UsersService } from './users.service';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { createPrismaMock, prismaClientKnownRequestError } from '../../test/prisma.mock';

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
});
