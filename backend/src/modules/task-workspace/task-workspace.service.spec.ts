import { NotFoundException } from '@nestjs/common';
import { TaskWorkspaceService } from './task-workspace.service';
import { createPrismaMock } from '../../test/prisma.mock';

describe('TaskWorkspaceService', () => {
  let prisma: any;
  let validationService: { validate: jest.Mock };
  let availabilityService: { findAvailableUsers: jest.Mock };
  let service: TaskWorkspaceService;

  beforeEach(() => {
    prisma = createPrismaMock();
    validationService = { validate: jest.fn().mockResolvedValue({ requiredErrors: [], warnings: [], summary: { isValid: true } }) };
    availabilityService = { findAvailableUsers: jest.fn().mockResolvedValue([{ id: 'user-1', firstName: 'Ada', lastName: 'Lovelace' }]) };
    service = new TaskWorkspaceService(prisma, validationService as any, availabilityService as any);
  });

  it('throws when the task instance is missing', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue(null);

    await expect(service.getWorkspace('missing')).rejects.toThrow(NotFoundException);
  });

  it('returns requirements for the task instance', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue({ id: 'instance-1', title: 'Morning shift', startTime: new Date(), endTime: new Date(), activityTask: { id: 'task-1', name: 'Setup', activity: { id: 'activity-1' } } });
    prisma.activityTaskManpowerRequirement.findUnique.mockResolvedValue({ required: true, quantity: 2 });
    prisma.activityTaskRoleRequirement.findMany.mockResolvedValue([{ roleId: 'role-1', required: true }]);
    prisma.activityTaskQualificationRequirement.findMany.mockResolvedValue([{ qualificationId: 'qual-1', required: false }]);
    prisma.assignment.findMany.mockResolvedValue([]);

    const result = await service.getWorkspace('instance-1');

    expect(result.requirements.manpower.required).toBe(true);
    expect(result.requirements.roleRequirements).toHaveLength(1);
    expect(result.requirements.qualificationRequirements).toHaveLength(1);
  });

  it('returns assignments for the task instance', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue({ id: 'instance-1', title: 'Morning shift', startTime: new Date(), endTime: new Date(), activityTask: { id: 'task-1', name: 'Setup', activity: { id: 'activity-1' } } });
    prisma.activityTaskManpowerRequirement.findUnique.mockResolvedValue(null);
    prisma.activityTaskRoleRequirement.findMany.mockResolvedValue([]);
    prisma.activityTaskQualificationRequirement.findMany.mockResolvedValue([]);
    prisma.assignment.findMany.mockResolvedValue([{ id: 'assignment-1', userId: 'user-1', user: { id: 'user-1', firstName: 'Ada', lastName: 'Lovelace' } }]);

    const result = await service.getWorkspace('instance-1');

    expect(result.currentAssignments).toHaveLength(1);
    expect(result.currentAssignments[0].assignmentId).toBe('assignment-1');
  });

  it('returns candidates from the existing availability logic', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue({ id: 'instance-1', title: 'Morning shift', startTime: new Date(), endTime: new Date(), activityTask: { id: 'task-1', name: 'Setup', activity: { id: 'activity-1' } } });
    prisma.activityTaskManpowerRequirement.findUnique.mockResolvedValue(null);
    prisma.activityTaskRoleRequirement.findMany.mockResolvedValue([]);
    prisma.activityTaskQualificationRequirement.findMany.mockResolvedValue([]);
    prisma.assignment.findMany.mockResolvedValue([]);

    const result = await service.getWorkspace('instance-1');

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].id).toBe('user-1');
  });

  it('returns validation details', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue({ id: 'instance-1', title: 'Morning shift', startTime: new Date(), endTime: new Date(), activityTask: { id: 'task-1', name: 'Setup', activity: { id: 'activity-1' } } });
    prisma.activityTaskManpowerRequirement.findUnique.mockResolvedValue(null);
    prisma.activityTaskRoleRequirement.findMany.mockResolvedValue([]);
    prisma.activityTaskQualificationRequirement.findMany.mockResolvedValue([]);
    prisma.assignment.findMany.mockResolvedValue([]);
    validationService.validate.mockResolvedValue({ requiredErrors: [{ type: 'MANPOWER', message: 'Missing manpower' }], warnings: [], summary: { isValid: false } });

    const result = await service.getWorkspace('instance-1');

    expect(result.validation.requiredErrors).toHaveLength(1);
    expect(result.validation.summary.isValid).toBe(false);
  });
});
