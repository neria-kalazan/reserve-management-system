import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TaskValidationService } from '../task-instances/task-validation.service';

@Injectable()
export class CompanyDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taskValidationService: TaskValidationService,
  ) {}

  async getDashboard(companyId: string) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const activeActivities = await this.prisma.activity.findMany({
      where: { companyId, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        status: true,
      },
      orderBy: { startDate: 'asc' },
    });

    if (activeActivities.length > 1) {
      throw new BadRequestException('Company has multiple active activities');
    }

    const activeActivity = activeActivities[0] ?? null;

    const [totalActiveUsers, activityUserStatuses, taskInstances] = await Promise.all([
      this.prisma.user.count({ where: { companyId, isActive: true } }),
      this.prisma.activityUserStatus.findMany({
        where: activeActivity ? { activityId: activeActivity.id } : { activityId: '' },
        select: { userId: true, status: true, availability: true },
      }),
      this.prisma.taskInstance.findMany({
        where: activeActivity ? { activityTask: { activityId: activeActivity.id } } : { id: '' },
        select: { id: true },
      }),
    ]);

    const usersParticipatingInActivity = activeActivity ? activityUserStatuses.length : 0;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const statusSummary = await this.prisma.activityUserStatus.groupBy({
      by: ['status'],
      where: activeActivity ? { activityId: activeActivity.id, date: today } : { activityId: '', date: today },
      _count: { _all: true },
    });

    const availabilitySummary = statusSummary.reduce(
      (acc, item) => {
        acc[item.status] = item._count._all;
        return acc;
      },
      {} as Record<string, number>,
    );

    const assignments = await this.prisma.assignment.findMany({
      where: activeActivity ? { taskInstance: { activityTask: { activityId: activeActivity.id } } } : { id: '' },
      select: { taskInstanceId: true },
    });

    const assignedTaskInstanceIds = new Set(assignments.map((assignment) => assignment.taskInstanceId));
    const unassignedTaskInstances = taskInstances.filter((taskInstance) => !assignedTaskInstanceIds.has(taskInstance.id)).length;

    const validationResults = await Promise.all(
      taskInstances.map((taskInstance) => this.taskValidationService.validate(taskInstance.id)),
    );

    const validationIssues = validationResults.reduce(
      (acc, validation) => {
        acc.requiredErrorCount += validation.requiredErrors.length;
        acc.warningCount += validation.warnings.length;
        acc.issues.push(...validation.requiredErrors, ...validation.warnings);
        return acc;
      },
      { requiredErrorCount: 0, warningCount: 0, issues: [] as Array<{ type: string; message: string }> },
    );

    return {
      activeActivity: activeActivity
        ? {
            id: activeActivity.id,
            name: activeActivity.name,
            startDate: activeActivity.startDate,
            endDate: activeActivity.endDate,
            numberOfDays: this.getNumberOfDays(activeActivity.startDate, activeActivity.endDate),
          }
        : null,
      manpowerSummary: {
        totalActiveUsers,
        usersParticipatingInActivity,
        todayAvailabilitySummary: {
          statusCounts: availabilitySummary,
        },
      },
      tasksSummary: {
        totalTaskInstances: taskInstances.length,
        unassignedTaskInstances,
        validationIssuesSummary: {
          requiredErrorCount: validationIssues.requiredErrorCount,
          warningCount: validationIssues.warningCount,
        },
      },
      validationIssues: {
        requiredErrorCount: validationIssues.requiredErrorCount,
        warningCount: validationIssues.warningCount,
        issues: validationIssues.issues,
      },
    };
  }

  private getNumberOfDays(startDate: Date, endDate: Date): number {
    const diffInMs = endDate.getTime() - startDate.getTime();
    return Math.max(1, Math.ceil(diffInMs / (1000 * 60 * 60 * 24)) + 1);
  }
}
