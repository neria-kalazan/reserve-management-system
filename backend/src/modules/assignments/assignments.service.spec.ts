import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { createPrismaMock } from '../../test/prisma.mock';

describe('AssignmentsService', () => {
  let prisma: any;
  let validationService: { validate: jest.Mock };
  let service: AssignmentsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    validationService = { validate: jest.fn().mockResolvedValue({ requiredErrors: [], warnings: [], summary: { isValid: true } }) };
    service = new AssignmentsService(prisma, validationService as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create: creates an assignment for a valid task instance and user', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue({ id: 'instance-1', activityTaskId: 'task-1' });
    prisma.activityTask.findUnique.mockResolvedValue({ id: 'task-1', activity: { companyId: 'company-1' } });
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', companyId: 'company-1' });
    prisma.assignment.create.mockResolvedValue({ id: 'assignment-1', taskInstanceId: 'instance-1', userId: 'user-1', createdBy: null });

    const res = await service.create('instance-1', { userId: 'user-1', createdBy: 'user-2' } as any);

    expect(res.assignment).toBeDefined();
    expect(res.validation).toEqual({ requiredErrors: [], warnings: [], summary: { isValid: true } });
    expect(prisma.assignment.create).toHaveBeenCalled();
    expect(validationService.validate).toHaveBeenCalledWith('instance-1');
  });

  it('create: throws when task instance is missing', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue(null);

    await expect(service.create('instance-1', { userId: 'user-1' } as any)).rejects.toThrow(NotFoundException);
  });

  it('create: throws when user is missing', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue({ id: 'instance-1', activityTaskId: 'task-1' });
    prisma.activityTask.findUnique.mockResolvedValue({ id: 'task-1', activity: { companyId: 'company-1' } });
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.create('instance-1', { userId: 'user-1' } as any)).rejects.toThrow(NotFoundException);
  });

  it('create: throws when user belongs to another company', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue({ id: 'instance-1', activityTaskId: 'task-1' });
    prisma.activityTask.findUnique.mockResolvedValue({ id: 'task-1', activity: { companyId: 'company-1' } });
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', companyId: 'company-2' });

    await expect(service.create('instance-1', { userId: 'user-1' } as any)).rejects.toThrow(BadRequestException);
  });

  it('create: throws on duplicate assignment', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue({ id: 'instance-1', activityTaskId: 'task-1' });
    prisma.activityTask.findUnique.mockResolvedValue({ id: 'task-1', activity: { companyId: 'company-1' } });
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', companyId: 'company-1' });
    prisma.assignment.findUnique.mockResolvedValue({ id: 'assignment-1' });

    await expect(service.create('instance-1', { userId: 'user-1' } as any)).rejects.toThrow(ConflictException);
  });

  it('findAllByTaskInstance: returns assignments for the task instance', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue({ id: 'instance-1' });
    prisma.assignment.findMany.mockResolvedValue([{ id: 'assignment-1', userId: 'user-1' }]);

    const res = await service.findAllByTaskInstance('instance-1');

    expect(res).toEqual([{ id: 'assignment-1', userId: 'user-1' }]);
  });

  it('delete: removes the existing assignment', async () => {
    prisma.assignment.findUnique.mockResolvedValue({ id: 'assignment-1' });
    prisma.assignment.delete.mockResolvedValue({ id: 'assignment-1' });

    await expect(service.delete('assignment-1')).resolves.toEqual({ id: 'assignment-1' });
  });

  it('delete: throws when assignment is missing', async () => {
    prisma.assignment.findUnique.mockResolvedValue(null);

    await expect(service.delete('assignment-1')).rejects.toThrow(NotFoundException);
  });
});
