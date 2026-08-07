import { NotFoundException } from '@nestjs/common';
import { TaskValidationService } from './task-validation.service';
import { createPrismaMock } from '../../test/prisma.mock';

describe('TaskValidationService', () => {
  let prisma: any;
  let service: TaskValidationService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new TaskValidationService(prisma);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('reports manpower validation errors', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue({
      id: 'instance-1',
      startTime: new Date('2026-01-01T09:00:00.000Z'),
      activityTask: { id: 'task-1', activity: { id: 'activity-1' } },
    });
    prisma.assignment.findMany.mockResolvedValue([{ userId: 'u1' }]);
    prisma.activityTaskManpowerRequirement.findUnique.mockResolvedValue({ required: true, quantity: 2 });
    prisma.activityTaskRoleRequirement.findMany.mockResolvedValue([]);
    prisma.activityTaskQualificationRequirement.findMany.mockResolvedValue([]);
    prisma.activityUserStatus.findMany.mockResolvedValue([]);
    prisma.user.findMany.mockResolvedValue([]);

    const res = await service.validate('instance-1');

    expect(res.requiredErrors).toEqual([{ type: 'MANPOWER', message: 'Missing required manpower' }]);
    expect(res.summary.isValid).toBe(false);
  });

  it('reports missing role requirements', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue({
      id: 'instance-1',
      startTime: new Date('2026-01-01T09:00:00.000Z'),
      activityTask: { id: 'task-1', activity: { id: 'activity-1' } },
    });
    prisma.assignment.findMany.mockResolvedValue([{ userId: 'u1' }]);
    prisma.activityTaskManpowerRequirement.findUnique.mockResolvedValue(null);
    prisma.activityTaskRoleRequirement.findMany.mockResolvedValue([{ roleId: 'role-1', required: true }]);
    prisma.activityTaskQualificationRequirement.findMany.mockResolvedValue([]);
    prisma.activityUserStatus.findMany.mockResolvedValue([]);
    prisma.user.findMany.mockResolvedValue([{ id: 'u1', userRoles: [], userQualifications: [] }]);

    const res = await service.validate('instance-1');

    expect(res.requiredErrors).toEqual([{ type: 'ROLE', message: 'Missing required role' }]);
  });

  it('reports missing qualification requirements', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue({
      id: 'instance-1',
      startTime: new Date('2026-01-01T09:00:00.000Z'),
      activityTask: { id: 'task-1', activity: { id: 'activity-1' } },
    });
    prisma.assignment.findMany.mockResolvedValue([{ userId: 'u1' }]);
    prisma.activityTaskManpowerRequirement.findUnique.mockResolvedValue(null);
    prisma.activityTaskRoleRequirement.findMany.mockResolvedValue([]);
    prisma.activityTaskQualificationRequirement.findMany.mockResolvedValue([{ qualificationId: 'qual-1', required: true }]);
    prisma.activityUserStatus.findMany.mockResolvedValue([]);
    prisma.user.findMany.mockResolvedValue([{ id: 'u1', userRoles: [], userQualifications: [] }]);

    const res = await service.validate('instance-1');

    expect(res.requiredErrors).toEqual([{ type: 'QUALIFICATION', message: 'Missing required qualification' }]);
  });

  it('adds availability warnings for mismatched availability', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue({
      id: 'instance-1',
      startTime: new Date('2026-01-01T09:00:00.000Z'),
      activityTask: { id: 'task-1', activity: { id: 'activity-1' } },
    });
    prisma.assignment.findMany.mockResolvedValue([{ userId: 'u1' }]);
    prisma.activityTaskManpowerRequirement.findUnique.mockResolvedValue(null);
    prisma.activityTaskRoleRequirement.findMany.mockResolvedValue([]);
    prisma.activityTaskQualificationRequirement.findMany.mockResolvedValue([]);
    prisma.activityUserStatus.findMany.mockResolvedValue([{ userId: 'u1', status: 'ACTIVE', availability: 'EVENING' }]);
    prisma.user.findMany.mockResolvedValue([{ id: 'u1', userRoles: [], userQualifications: [] }]);

    const res = await service.validate('instance-1');

    expect(res.warnings).toEqual([{ type: 'AVAILABILITY', message: 'User is not available for this task time' }]);
  });

  it('allows morning compatibility and ignores optional missing requirements', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue({
      id: 'instance-1',
      startTime: new Date('2026-01-01T09:00:00.000Z'),
      activityTask: { id: 'task-1', activity: { id: 'activity-1' } },
    });
    prisma.assignment.findMany.mockResolvedValue([{ userId: 'u1' }]);
    prisma.activityTaskManpowerRequirement.findUnique.mockResolvedValue({ required: true, quantity: 1 });
    prisma.activityTaskRoleRequirement.findMany.mockResolvedValue([{ roleId: 'role-1', required: false }]);
    prisma.activityTaskQualificationRequirement.findMany.mockResolvedValue([{ qualificationId: 'qual-1', required: false }]);
    prisma.activityUserStatus.findMany.mockResolvedValue([{ userId: 'u1', status: 'ACTIVE', availability: 'MORNING' }]);
    prisma.user.findMany.mockResolvedValue([{ id: 'u1', userRoles: [], userQualifications: [] }]);

    const res = await service.validate('instance-1');

    expect(res.requiredErrors).toEqual([]);
    expect(res.warnings).toEqual([
      { type: 'ROLE', message: 'Optional role requirement is missing' },
      { type: 'QUALIFICATION', message: 'Optional qualification requirement is missing' },
    ]);
  });

  it('allows evening compatibility', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue({
      id: 'instance-1',
      startTime: new Date('2026-01-01T15:00:00.000Z'),
      activityTask: { id: 'task-1', activity: { id: 'activity-1' } },
    });
    prisma.assignment.findMany.mockResolvedValue([{ userId: 'u1' }]);
    prisma.activityTaskManpowerRequirement.findUnique.mockResolvedValue(null);
    prisma.activityTaskRoleRequirement.findMany.mockResolvedValue([]);
    prisma.activityTaskQualificationRequirement.findMany.mockResolvedValue([]);
    prisma.activityUserStatus.findMany.mockResolvedValue([{ userId: 'u1', status: 'ACTIVE', availability: 'EVENING' }]);
    prisma.user.findMany.mockResolvedValue([{ id: 'u1', userRoles: [], userQualifications: [] }]);

    const res = await service.validate('instance-1');

    expect(res.warnings).toEqual([]);
  });

  it('reports overstaffing as warnings only', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue({
      id: 'instance-1',
      startTime: new Date('2026-01-01T09:00:00.000Z'),
      activityTask: { id: 'task-1', activity: { id: 'activity-1' } },
    });
    prisma.assignment.findMany.mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }]);
    prisma.activityTaskManpowerRequirement.findUnique.mockResolvedValue({ required: true, quantity: 1 });
    prisma.activityTaskRoleRequirement.findMany.mockResolvedValue([]);
    prisma.activityTaskQualificationRequirement.findMany.mockResolvedValue([]);
    prisma.activityUserStatus.findMany.mockResolvedValue([]);
    prisma.user.findMany.mockResolvedValue([{ id: 'u1', userRoles: [], userQualifications: [] }, { id: 'u2', userRoles: [], userQualifications: [] }]);

    const res = await service.validate('instance-1');

    expect(res.requiredErrors).toEqual([]);
    expect(res.warnings).toEqual([{ type: 'MANPOWER', message: 'Assigned users exceed required manpower' }]);
  });

  it('adds warnings for holiday users', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue({
      id: 'instance-1',
      startTime: new Date('2026-01-01T09:00:00.000Z'),
      activityTask: { id: 'task-1', activity: { id: 'activity-1' } },
    });
    prisma.assignment.findMany.mockResolvedValue([{ userId: 'u1' }]);
    prisma.activityTaskManpowerRequirement.findUnique.mockResolvedValue(null);
    prisma.activityTaskRoleRequirement.findMany.mockResolvedValue([]);
    prisma.activityTaskQualificationRequirement.findMany.mockResolvedValue([]);
    prisma.activityUserStatus.findMany.mockResolvedValue([{ userId: 'u1', status: 'HOLIDAY', availability: 'ALL_DAY' }]);
    prisma.user.findMany.mockResolvedValue([{ id: 'u1', userRoles: [], userQualifications: [] }]);

    const res = await service.validate('instance-1');

    expect(res.warnings).toEqual([{ type: 'AVAILABILITY', message: 'User status is not active for this task date' }]);
  });

  it('adds warnings for released users', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue({
      id: 'instance-1',
      startTime: new Date('2026-01-01T09:00:00.000Z'),
      activityTask: { id: 'task-1', activity: { id: 'activity-1' } },
    });
    prisma.assignment.findMany.mockResolvedValue([{ userId: 'u1' }]);
    prisma.activityTaskManpowerRequirement.findUnique.mockResolvedValue(null);
    prisma.activityTaskRoleRequirement.findMany.mockResolvedValue([]);
    prisma.activityTaskQualificationRequirement.findMany.mockResolvedValue([]);
    prisma.activityUserStatus.findMany.mockResolvedValue([{ userId: 'u1', status: 'RELEASED', availability: 'ALL_DAY' }]);
    prisma.user.findMany.mockResolvedValue([{ id: 'u1', userRoles: [], userQualifications: [] }]);

    const res = await service.validate('instance-1');

    expect(res.warnings).toEqual([{ type: 'AVAILABILITY', message: 'User status is not active for this task date' }]);
  });

  it('throws when the task instance is missing', async () => {
    prisma.taskInstance.findUnique.mockResolvedValue(null);

    await expect(service.validate('instance-1')).rejects.toThrow(NotFoundException);
  });
});
