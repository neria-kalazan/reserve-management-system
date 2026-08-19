import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TaskValidationService } from '../task-instances/task-validation.service';

@Injectable()
export class ActivityOverviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taskValidationService: TaskValidationService,
  ) {}

  async getOverview(activityId: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        status: true,
        company: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    const [activityUserStatuses, activityTasks, taskInstances, assignments] = await Promise.all([
      this.prisma.activityUserStatus.findMany({
        where: { activityId },
        select: { userId: true, status: true, availability: true },
      }),
      this.prisma.activityTask.findMany({
        where: { activityId },
        select: { id: true, name: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.taskInstance.findMany({
        where: { activityTask: { activityId } },
        select: { id: true, title: true, activityTaskId: true },
        orderBy: { startTime: 'asc' },
      }),
      this.prisma.assignment.findMany({
        where: { taskInstance: { activityTask: { activityId } } },
        select: { taskInstanceId: true, userId: true },
      }),
    ]);

    const taskInstanceAssignments = new Map<string, number>();
    for (const assignment of assignments) {
      taskInstanceAssignments.set(assignment.taskInstanceId, (taskInstanceAssignments.get(assignment.taskInstanceId) ?? 0) + 1);
    }

    const tasksOverview = await Promise.all(
      activityTasks.map(async (activityTask) => {
        const taskInstancesForTask = taskInstances.filter((taskInstance) => taskInstance.activityTaskId === activityTask.id);
        const assignedUserCount = taskInstancesForTask.reduce((total, taskInstance) => total + (taskInstanceAssignments.get(taskInstance.id) ?? 0), 0);
        const totalTaskInstances = taskInstancesForTask.length;
        const unassignedTaskInstances = taskInstancesForTask.filter((taskInstance) => (taskInstanceAssignments.get(taskInstance.id) ?? 0) === 0).length;

        const validationSummary = await Promise.all(
          taskInstancesForTask.map((taskInstance) => this.taskValidationService.validate(taskInstance.id)),
        );

        const validationSummaryForTask = validationSummary.reduce(
          (acc, validation) => {
            acc.requiredErrorCount += validation.requiredErrors.length;
            acc.warningCount += validation.warnings.length;
            return acc;
          },
          { requiredErrorCount: 0, warningCount: 0 },
        );

        return {
          taskId: activityTask.id,
          taskName: activityTask.name,
          taskInstances: taskInstancesForTask.map((taskInstance) => ({
            id: taskInstance.id,
            title: taskInstance.title,
          })),
          assignedUsersCount: assignedUserCount,
          assignmentSummary: {
            totalTaskInstances,
            assignedTaskInstances: totalTaskInstances - unassignedTaskInstances,
            unassignedTaskInstances,
            totalAssignments: assignedUserCount,
          },
          validationSummary: validationSummaryForTask,
        };
      }),
    );

    const dailyStatusSummary = activityUserStatuses.reduce(
      (acc, item) => {
        acc[item.status] = (acc[item.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const availabilitySummary = activityUserStatuses.reduce(
      (acc, item) => {
        acc[item.availability] = (acc[item.availability] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const participatingUserIds = [...new Set(activityUserStatuses.map((item) => item.userId))];
    const holidayDaysByUser = new Map<string, number>();

    for (const item of activityUserStatuses) {
      if (item.status === 'HOLIDAY') {
        holidayDaysByUser.set(item.userId, (holidayDaysByUser.get(item.userId) ?? 0) + 1);
      }
    }

    const totalHolidayDays = [...holidayDaysByUser.values()].reduce((sum, count) => sum + count, 0);
    const averageHolidayDaysPerSoldier = participatingUserIds.length > 0 ? totalHolidayDays / participatingUserIds.length : 0;
    const administrativeActiveDays = activityUserStatuses.filter((item) => item.status === 'ACTIVE').length;

    return {
      activity: {
        id: activity.id,
        name: activity.name,
        startDate: activity.startDate,
        endDate: activity.endDate,
        status: activity.status,
        company: activity.company,
      },
      manpowerSummary: {
        participantCount: activityUserStatuses.length,
        dailyStatusSummary,
      },
      tasksOverview,
      availabilitySummary: {
        byAvailability: availabilitySummary,
      },
      averageHolidayDaysPerSoldier,
      administrativeActiveDays,
    };
  }
}
