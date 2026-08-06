import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { UserQualificationsService } from './user-qualifications.service';
import { createPrismaMock, prismaClientKnownRequestError } from '../../test/prisma.mock';

describe('UserQualificationsService', () => {
  let prisma: any;
  let service: UserQualificationsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new UserQualificationsService(prisma);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('assign: creates relation when user and qualification valid and same company', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', companyId: 'c1' });
    prisma.qualification.findUnique.mockResolvedValue({ id: 'q1', companyId: 'c1' });
    prisma.userQualification.create.mockResolvedValue({ userId: 'u1', qualificationId: 'q1' });

    const res = await service.assign('u1', 'q1');

    expect(res).toBeDefined();
    expect(prisma.userQualification.create).toHaveBeenCalled();
  });

  it('assign: missing user throws NotFoundException', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.assign('u1', 'q1')).rejects.toThrow(NotFoundException);
  });

  it('assign: missing qualification throws NotFoundException', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', companyId: 'c1' });
    prisma.qualification.findUnique.mockResolvedValue(null);

    await expect(service.assign('u1', 'q1')).rejects.toThrow(NotFoundException);
  });

  it('assign: different companies throws BadRequestException', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', companyId: 'c1' });
    prisma.qualification.findUnique.mockResolvedValue({ id: 'q1', companyId: 'c2' });

    await expect(service.assign('u1', 'q1')).rejects.toThrow(BadRequestException);
  });

  it('assign: duplicate assignment throws ConflictException', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', companyId: 'c1' });
    prisma.qualification.findUnique.mockResolvedValue({ id: 'q1', companyId: 'c1' });
    prisma.userQualification.create.mockImplementation(() => {
      throw prismaClientKnownRequestError('P2002');
    });

    await expect(service.assign('u1', 'q1')).rejects.toThrow(ConflictException);
  });

  it('remove: deletes the qualification relation', async () => {
    prisma.userQualification.findUnique.mockResolvedValue({ userId: 'u1', qualificationId: 'q1' });
    prisma.userQualification.delete.mockResolvedValue({ userId: 'u1', qualificationId: 'q1' });

    await expect(service.remove('u1', 'q1')).resolves.toEqual({ userId: 'u1', qualificationId: 'q1' });
    expect(prisma.userQualification.delete).toHaveBeenCalled();
  });
});
