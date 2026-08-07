import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TaskValidationService } from '../task-instances/task-validation.service';
import { TaskInstancesService } from '../task-instances/task-instances.service';

@Injectable()
export class TaskWorkspaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taskValidationService: TaskValidationService,
    private readonly taskInstancesService: TaskInstancesService,
  ) {}

  async getWorkspace(taskInstanceId: string) {
    const taskInstance = await this.prisma.taskInstance.findUnique({
      where: { id: taskInstanceId },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        activityTask: {
          select: {
            id: true,
            name: true,
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

    const [requirements, assignments, validation, candidates] = await Promise.all([
      this.getRequirements(taskInstance.activityTask.id),
      this.getAssignments(taskInstanceId),
      this.taskValidationService.validate(taskInstanceId),
      this.taskInstancesService.findAvailableUsers(taskInstanceId),
    ]);

    return {
      taskInstance: {
        id: taskInstance.id,
        title: taskInstance.title,
        startTime: taskInstance.startTime,
        endTime: taskInstance.endTime,
        activityTask: {
          id: taskInstance.activityTask.id,
          name: taskInstance.activityTask.name,
        },
      },
      requirements,
      currentAssignments: assignments,
      candidates,
      validation,
    };
  }

  private async getRequirements(activityTaskId: string) {
    const [manpowerRequirement, roleRequirements, qualificationRequirements] = await Promise.all([
      this.prisma.activityTaskManpowerRequirement.findUnique({
        where: { activityTaskId },
        select: { required: true, quantity: true },
      }),
      this.prisma.activityTaskRoleRequirement.findMany({
        where: { activityTaskId },
        select: { roleId: true, required: true, quantity: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.activityTaskQualificationRequirement.findMany({
        where: { activityTaskId },
        select: { qualificationId: true, required: true, quantity: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return {
      manpower: manpowerRequirement ?? { required: false, quantity: 0 },
      roleRequirements,
      qualificationRequirements,
    };
  }

  private async getAssignments(taskInstanceId: string) {
    const assignments = await this.prisma.assignment.findMany({
      where: { taskInstanceId },
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return assignments.map((assignment: any) => ({
      assignmentId: assignment.id,
      userId: assignment.userId,
      user: assignment.user,
    }));
  }
}
