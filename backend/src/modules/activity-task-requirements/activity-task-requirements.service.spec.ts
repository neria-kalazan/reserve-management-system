import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ActivityTaskRequirementsService } from './activity-task-requirements.service';
import { createPrismaMock } from '../../test/prisma.mock';

describe('ActivityTaskRequirementsService', () => {
  let prisma: any;
  let service: ActivityTaskRequirementsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    prisma.$transaction.mockImplementation(async (callback: any) => callback(prisma));
    service = new ActivityTaskRequirementsService(prisma);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('replaceRequirements: throws when activity task is missing', async () => {
    prisma.activityTask.findUnique.mockResolvedValue(null);

    await expect(service.replaceRequirements('task-1', { roles: [] } as any)).rejects.toThrow(NotFoundException);
  });

  it('replaceRequirements: rejects roles outside the activity company', async () => {
    prisma.activityTask.findUnique.mockResolvedValue({ id: 'task-1', activity: { companyId: 'company-1' } });
    prisma.role.findUnique.mockResolvedValue({ id: 'role-1', companyId: 'company-2' });

    await expect(
      service.replaceRequirements('task-1', {
        roles: [{ roleId: 'role-1', quantity: 1, required: true }],
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('replaceRequirements: replaces existing requirements and returns the new definition', async () => {
    prisma.activityTask.findUnique.mockResolvedValue({ id: 'task-1', activity: { companyId: 'company-1' } });
    prisma.role.findUnique.mockResolvedValue({ id: 'role-1', companyId: 'company-1' });
    prisma.qualification.findUnique.mockResolvedValue({ id: 'qualification-1', companyId: 'company-1' });
    prisma.activityTaskManpowerRequirement.deleteMany.mockResolvedValue({ count: 1 });
    prisma.activityTaskRoleRequirement.deleteMany.mockResolvedValue({ count: 1 });
    prisma.activityTaskQualificationRequirement.deleteMany.mockResolvedValue({ count: 1 });
    prisma.activityTaskManpowerRequirement.create.mockResolvedValue({ id: 'mp-1', quantity: 2, required: true });
    prisma.activityTaskRoleRequirement.create.mockResolvedValue({ id: 'role-req-1', roleId: 'role-1', quantity: 2, required: true });
    prisma.activityTaskQualificationRequirement.create.mockResolvedValue({ id: 'qual-req-1', qualificationId: 'qualification-1', quantity: 1, required: false });

    const result = await service.replaceRequirements('task-1', {
      manpower: { quantity: 2, required: true },
      roles: [{ roleId: 'role-1', quantity: 2, required: true }],
      qualifications: [{ qualificationId: 'qualification-1', quantity: 1, required: false }],
    } as any);

    expect(result.manpower).toEqual({ quantity: 2, required: true });
    expect(result.roles).toHaveLength(1);
    expect(result.qualifications).toHaveLength(1);
    expect(prisma.activityTaskManpowerRequirement.deleteMany).toHaveBeenCalled();
    expect(prisma.activityTaskRoleRequirement.create).toHaveBeenCalled();
    expect(prisma.activityTaskQualificationRequirement.create).toHaveBeenCalled();
  });
});
