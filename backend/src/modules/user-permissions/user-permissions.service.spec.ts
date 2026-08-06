import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserPermissionsService } from './user-permissions.service';
import { createPrismaMock, prismaClientKnownRequestError } from '../../test/prisma.mock';

describe('UserPermissionsService', () => {
  let prisma: any;
  let service: UserPermissionsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new UserPermissionsService(prisma);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('assign: creates relation when user and permission exist', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    prisma.permission.findUnique.mockResolvedValue({ id: 'p1' });
    prisma.userPermission.create.mockResolvedValue({ userId: 'u1', permissionId: 'p1' });

    const res = await service.assign('u1', 'p1');

    expect(res).toBeDefined();
    expect(prisma.userPermission.create).toHaveBeenCalled();
  });

  it('assign: missing user throws NotFoundException', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.assign('u1', 'p1')).rejects.toThrow(NotFoundException);
  });

  it('assign: missing permission throws NotFoundException', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    prisma.permission.findUnique.mockResolvedValue(null);

    await expect(service.assign('u1', 'p1')).rejects.toThrow(NotFoundException);
  });

  it('assign: duplicate assignment throws ConflictException', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    prisma.permission.findUnique.mockResolvedValue({ id: 'p1' });
    prisma.userPermission.create.mockImplementation(() => {
      throw prismaClientKnownRequestError('P2002');
    });

    await expect(service.assign('u1', 'p1')).rejects.toThrow(ConflictException);
  });

  it('remove: deletes the permission relation', async () => {
    prisma.userPermission.findUnique.mockResolvedValue({ userId: 'u1', permissionId: 'p1' });
    prisma.userPermission.delete.mockResolvedValue({ userId: 'u1', permissionId: 'p1' });

    await expect(service.remove('u1', 'p1')).resolves.toEqual({ userId: 'u1', permissionId: 'p1' });
    expect(prisma.userPermission.delete).toHaveBeenCalled();
  });
});
