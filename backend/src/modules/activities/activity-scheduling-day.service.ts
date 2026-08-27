import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SchedulingDayAssignmentDto,
  SchedulingDayAvailabilitySnapshotDto,
  SchedulingDayResponseDto,
  SchedulingDayTaskInstanceDto,
} from './dto/scheduling-day-read-model.dto';
import { TaskValidationResult, TaskValidationService } from '../task-instances/task-validation.service';
import { TaskInstancesService } from '../task-instances/task-instances.service';

@Injectable()
export class ActivitySchedulingDayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taskValidationService: TaskValidationService,
    private readonly taskInstancesService: TaskInstancesService,
  ) {}

  async getSchedulingDay(activityId: string, dateString: string): Promise<SchedulingDayResponseDto> {
    const dayStart = this.normalizeDate(dateString);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
    const selectedDate = this.formatDateKey(dayStart);

    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: {
        id: true,
        companyId: true,
        name: true,
        status: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    const taskInstancesRaw = await this.prisma.taskInstance.findMany({
      where: {
        activityTask: {
          activityId,
        },
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
      select: {
        id: true,
        activityTaskId: true,
        title: true,
        startTime: true,
        endTime: true,
        createdAt: true,
        updatedAt: true,
        activityTask: {
          select: {
            id: true,
            activityId: true,
            name: true,
            description: true,
          },
        },
        assignments: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            taskInstanceId: true,
            userId: true,
            createdBy: true,
            createdAt: true,
            updatedAt: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                personalNumber: true,
                phone: true,
                email: true,
                isActive: true,
                unit: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    const taskInstancesForActivity = taskInstancesRaw.filter((taskInstance) => taskInstance.activityTask.activityId === activityId);
    const taskInstanceIds = taskInstancesForActivity.map((taskInstance) => taskInstance.id);
    const activityTaskIds = [...new Set(taskInstancesForActivity.map((taskInstance) => taskInstance.activityTaskId))];

    const [manpowerRequirements, roleRequirements, qualificationRequirements, validations] = await Promise.all([
      activityTaskIds.length > 0
        ? this.prisma.activityTaskManpowerRequirement.findMany({
            where: { activityTaskId: { in: activityTaskIds } },
            select: { activityTaskId: true, required: true, quantity: true },
          })
        : [],
      activityTaskIds.length > 0
        ? this.prisma.activityTaskRoleRequirement.findMany({
            where: { activityTaskId: { in: activityTaskIds } },
            select: {
              activityTaskId: true,
              roleId: true,
              required: true,
              quantity: true,
              role: { select: { name: true } },
            },
            orderBy: { createdAt: 'asc' },
          })
        : [],
      activityTaskIds.length > 0
        ? this.prisma.activityTaskQualificationRequirement.findMany({
            where: { activityTaskId: { in: activityTaskIds } },
            select: {
              activityTaskId: true,
              qualificationId: true,
              required: true,
              quantity: true,
              qualification: { select: { name: true } },
            },
            orderBy: { createdAt: 'asc' },
          })
        : [],
      Promise.all(taskInstanceIds.map((taskInstanceId) => this.taskValidationService.validate(taskInstanceId))),
    ]);

    const manpowerByTask = new Map(manpowerRequirements.map((requirement) => [requirement.activityTaskId, requirement]));
    const rolesByTask = new Map<string, Array<{ roleId: string; required: boolean; quantity: number; roleName?: string }>>();
    for (const requirement of roleRequirements) {
      const list = rolesByTask.get(requirement.activityTaskId) ?? [];
      list.push({
        roleId: requirement.roleId,
        required: requirement.required,
        quantity: requirement.quantity,
        roleName: requirement.role?.name,
      });
      rolesByTask.set(requirement.activityTaskId, list);
    }

    const qualificationsByTask = new Map<string, Array<{ qualificationId: string; required: boolean; quantity: number; qualificationName?: string }>>();
    for (const requirement of qualificationRequirements) {
      const list = qualificationsByTask.get(requirement.activityTaskId) ?? [];
      list.push({
        qualificationId: requirement.qualificationId,
        required: requirement.required,
        quantity: requirement.quantity,
        qualificationName: requirement.qualification?.name,
      });
      qualificationsByTask.set(requirement.activityTaskId, list);
    }

    const validationByTaskInstance = new Map<string, TaskValidationResult>();
    for (let index = 0; index < taskInstanceIds.length; index += 1) {
      validationByTaskInstance.set(taskInstanceIds[index], validations[index]);
    }

    const assignmentEvaluations = await Promise.all(
      taskInstancesForActivity.flatMap((taskInstance) =>
        taskInstance.assignments.map(async (assignment) => ({
          taskInstanceId: taskInstance.id,
          userId: assignment.userId,
          evaluation: await this.taskInstancesService.evaluateCandidate(taskInstance.id, assignment.userId),
        })),
      ),
    );

    const evaluationByTaskInstanceAndUser = new Map<string, { severity: 'NORMAL' | 'WARNING' | 'CRITICAL'; reasonCodes: string[]; reasonMessages: string[] }>();
    for (const item of assignmentEvaluations) {
      evaluationByTaskInstanceAndUser.set(`${item.taskInstanceId}:${item.userId}`, item.evaluation);
    }

    const assignedUserIds = [
      ...new Set(
        taskInstancesForActivity.flatMap((taskInstance) => taskInstance.assignments.map((assignment) => assignment.userId)),
      ),
    ];

    const availabilityDates = [
      ...new Set(taskInstancesForActivity.map((taskInstance) => this.formatDateKey(this.toDayStart(taskInstance.startTime)))),
    ].map((dateKey) => this.normalizeDate(dateKey));

    const availabilityRecords = assignedUserIds.length > 0 && availabilityDates.length > 0
      ? await this.prisma.activityUserStatus.findMany({
          where: {
            activityId,
            userId: { in: assignedUserIds },
            date: { in: availabilityDates },
          },
          select: {
            userId: true,
            date: true,
            status: true,
            availability: true,
          },
        })
      : [];

    const availabilityByUserAndDate = new Map<string, SchedulingDayAvailabilitySnapshotDto>();
    for (const record of availabilityRecords) {
      availabilityByUserAndDate.set(`${record.userId}:${this.formatDateKey(new Date(record.date))}`, {
        status: record.status,
        availability: record.availability,
      });
    }

    const schedulingTaskInstances: SchedulingDayTaskInstanceDto[] = taskInstancesForActivity.map((taskInstance) => {
      const manpower = manpowerByTask.get(taskInstance.activityTaskId) ?? null;
      const roles = rolesByTask.get(taskInstance.activityTaskId) ?? [];
      const qualifications = qualificationsByTask.get(taskInstance.activityTaskId) ?? [];

      const assignments: SchedulingDayAssignmentDto[] = taskInstance.assignments.map((assignment) => {
        const availabilityKey = `${assignment.userId}:${this.formatDateKey(this.toDayStart(taskInstance.startTime))}`;
        const availability = availabilityByUserAndDate.get(availabilityKey);
        const evaluation = evaluationByTaskInstanceAndUser.get(`${taskInstance.id}:${assignment.userId}`) ?? {
          severity: 'NORMAL',
          reasonCodes: [],
          reasonMessages: [],
        };

        return {
          id: assignment.id,
          taskInstanceId: assignment.taskInstanceId,
          userId: assignment.userId,
          createdBy: assignment.createdBy,
          createdAt: assignment.createdAt,
          updatedAt: assignment.updatedAt,
          user: {
            id: assignment.user.id,
            firstName: assignment.user.firstName,
            lastName: assignment.user.lastName,
            personalNumber: assignment.user.personalNumber,
            phone: assignment.user.phone,
            email: assignment.user.email,
            isActive: assignment.user.isActive,
            unit: assignment.user.unit,
          },
          ...(availability ? { availability } : {}),
          evaluation,
        };
      });

      const assignmentCount = assignments.length;
      const totalSlots = manpower ? Math.max(manpower.quantity, assignmentCount) : assignmentCount;

      return {
        id: taskInstance.id,
        activityTaskId: taskInstance.activityTaskId,
        activityTask: {
          id: taskInstance.activityTask.id,
          name: taskInstance.activityTask.name,
          description: taskInstance.activityTask.description,
        },
        title: taskInstance.title,
        startTime: taskInstance.startTime,
        endTime: taskInstance.endTime,
        isOvernight: this.formatDateKey(taskInstance.startTime) !== this.formatDateKey(taskInstance.endTime),
        requirements: {
          manpower: manpower
            ? {
                required: manpower.required,
                quantity: manpower.quantity,
              }
            : null,
          roles,
          qualifications,
        },
        assignmentSlots: {
          total: totalSlots,
          filled: assignmentCount,
          unfilled: Math.max(totalSlots - assignmentCount, 0),
        },
        assignments,
        validation: validationByTaskInstance.get(taskInstance.id) ?? {
          requiredErrors: [],
          warnings: [],
          summary: { isValid: true },
        },
      };
    });

    return {
      activity: {
        id: activity.id,
        companyId: activity.companyId,
        name: activity.name,
        status: activity.status,
        startDate: activity.startDate,
        endDate: activity.endDate,
      },
      date: selectedDate,
      isDayOpened: schedulingTaskInstances.length > 0,
      taskInstances: schedulingTaskInstances,
    };
  }

  private normalizeDate(date: string): Date {
    const trimmed = String(date).trim();
    const [year, month, day] = trimmed.split('-').map(Number);

    if (!year || !month || !day) {
      throw new BadRequestException('Invalid date');
    }

    const normalized = new Date(Date.UTC(year, month - 1, day));
    if (
      normalized.getUTCFullYear() !== year ||
      normalized.getUTCMonth() !== month - 1 ||
      normalized.getUTCDate() !== day
    ) {
      throw new BadRequestException('Invalid date');
    }

    return normalized;
  }

  private toDayStart(date: Date): Date {
    const normalized = new Date(date);
    normalized.setUTCHours(0, 0, 0, 0);
    return normalized;
  }

  private formatDateKey(date: Date): string {
    const normalized = new Date(date);
    normalized.setUTCHours(0, 0, 0, 0);
    const year = normalized.getUTCFullYear();
    const month = String(normalized.getUTCMonth() + 1).padStart(2, '0');
    const day = String(normalized.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}