import { UserRolesService } from './user-roles.service';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { createPrismaMock, prismaClientKnownRequestError } from '../../test/prisma.mock';

describe('UserRolesService', () => {
  let prisma: any;
  let service: UserRolesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new UserRolesService(prisma);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('assign: creates relation when user and role valid and same company', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', companyId: 'c1' });
    prisma.role.findUnique.mockResolvedValue({ id: 'r1', companyId: 'c1' });
    prisma.userRole.create.mockResolvedValue({ userId: 'u1', roleId: 'r1' });

    const res = await service.assign('u1', 'r1');
    expect(res).toBeDefined();
    expect(prisma.userRole.create).toHaveBeenCalled();
  });

  it('assign: missing user throws NotFoundException', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.assign('u1', 'r1')).rejects.toThrow(NotFoundException);
  });

  it('assign: missing role throws NotFoundException', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', companyId: 'c1' });
    prisma.role.findUnique.mockResolvedValue(null);
    await expect(service.assign('u1', 'r1')).rejects.toThrow(NotFoundException);
  });

  it('assign: different companies throws BadRequestException', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', companyId: 'c1' });
    prisma.role.findUnique.mockResolvedValue({ id: 'r1', companyId: 'other' });
    await expect(service.assign('u1', 'r1')).rejects.toThrow(BadRequestException);
  });

  it('assign: duplicate assignment throws ConflictException', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', companyId: 'c1' });
    prisma.role.findUnique.mockResolvedValue({ id: 'r1', companyId: 'c1' });
    prisma.userRole.create.mockImplementation(() => {
      throw prismaClientKnownRequestError('P2002');
    });

    await expect(service.assign('u1', 'r1')).rejects.toThrow(ConflictException);
  });
});
