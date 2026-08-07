import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ValidationIssue {
  type: 'MANPOWER' | 'ROLE' | 'QUALIFICATION' | 'AVAILABILITY';
  message: string;
}

export interface TaskValidationSummary {
  isValid: boolean;
}

export interface TaskValidationResult {
  requiredErrors: ValidationIssue[];
  warnings: ValidationIssue[];
  summary: TaskValidationSummary;
}

@Injectable()
export class TaskValidationService {
  constructor(private readonly prisma: PrismaService) {}

  async validate(taskInstanceId: string): Promise<TaskValidationResult> {
    const taskInstance = await this.prisma.taskInstance.findUnique({
      where: { id: taskInstanceId },
      select: {
        id: true,
        startTime: true,
        activityTask: {
          select: {
            id: true,
            activity: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!taskInstance) {
      throw new NotFoundException('Task instance not found');
    }

    const activity = taskInstance.activityTask?.activity;

    if (!activity?.id) {
      throw new NotFoundException('Activity not found');
    }

    const [assignments, manpowerRequirement, roleRequirements, qualificationRequirements, availabilityRecords] = await Promise.all([
      this.prisma.assignment.findMany({
        where: { taskInstanceId },
        select: { userId: true },
      }),
      this.prisma.activityTaskManpowerRequirement.findUnique({
        where: { activityTaskId: taskInstance.activityTask.id },
        select: { required: true, quantity: true },
      }),
      this.prisma.activityTaskRoleRequirement.findMany({
        where: { activityTaskId: taskInstance.activityTask.id },
        select: { roleId: true, required: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.activityTaskQualificationRequirement.findMany({
        where: { activityTaskId: taskInstance.activityTask.id },
        select: { qualificationId: true, required: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.activityUserStatus.findMany({
        where: {
          activityId: activity.id,
          date: this.toDayStart(taskInstance.startTime),
        },
        select: {
          userId: true,
          status: true,
          availability: true,
        },
      }),
    ]);

    const requiredErrors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const assignedUserIds = assignments.map((assignment) => assignment.userId);

    if (manpowerRequirement?.required) {
      const assignmentCount = assignedUserIds.length;
      const requiredQuantity = manpowerRequirement.quantity ?? 0;

      if (assignmentCount < requiredQuantity) {
        requiredErrors.push({ type: 'MANPOWER', message: 'Missing required manpower' });
      } else if (assignmentCount > requiredQuantity) {
        warnings.push({ type: 'MANPOWER', message: 'Assigned users exceed required manpower' });
      }
    }

    const assignedUsers = await this.prisma.user.findMany({
      where: { id: { in: assignedUserIds } },
      select: { id: true, userRoles: { select: { roleId: true } }, userQualifications: { select: { qualificationId: true } } },
    });

    for (const requirement of roleRequirements) {
      const hasRole = assignedUsers.some((user) => user.userRoles.some((relation) => relation.roleId === requirement.roleId));
      if (!hasRole) {
        if (requirement.required) {
          requiredErrors.push({ type: 'ROLE', message: 'Missing required role' });
        } else {
          warnings.push({ type: 'ROLE', message: 'Optional role requirement is missing' });
        }
      }
    }

    for (const requirement of qualificationRequirements) {
      const hasQualification = assignedUsers.some((user) => user.userQualifications.some((relation) => relation.qualificationId === requirement.qualificationId));
      if (!hasQualification) {
        if (requirement.required) {
          requiredErrors.push({ type: 'QUALIFICATION', message: 'Missing required qualification' });
        } else {
          warnings.push({ type: 'QUALIFICATION', message: 'Optional qualification requirement is missing' });
        }
      }
    }

    for (const assignment of assignments) {
      const record = availabilityRecords.find((item) => item.userId === assignment.userId);
      if (!record) {
        continue;
      }

      if (record.status !== 'ACTIVE') {
        warnings.push({ type: 'AVAILABILITY', message: 'User status is not active for this task date' });
        continue;
      }

      const isMorningTask = taskInstance.startTime.getHours() < 14;
      const allowedAvailability = isMorningTask ? ['ALL_DAY', 'MORNING'] : ['ALL_DAY', 'EVENING'];

      if (!allowedAvailability.includes(record.availability)) {
        warnings.push({ type: 'AVAILABILITY', message: 'User is not available for this task time' });
      }
    }

    return {
      requiredErrors,
      warnings,
      summary: {
        isValid: requiredErrors.length === 0,
      },
    };
  }

  private toDayStart(date: Date): Date {
    const normalized = new Date(date);
    normalized.setUTCHours(0, 0, 0, 0);
    return normalized;
  }
}
