import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SchedulingDayAssignmentDto,
  SchedulingDayAvailabilitySnapshotDto,
  SchedulingDayResponseDto,
  SchedulingDayTaskInstanceDto,
} from './dto/scheduling-day-read-model.dto';
import { TaskValidationResult, TaskValidationService } from '../task-instances/task-validation.service';
import { CandidateEvaluationResult, TaskInstancesService } from '../task-instances/task-instances.service';

@Injectable()
export class ActivitySchedulingDayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taskValidationService: TaskValidationService,
    private readonly taskInstancesService: TaskInstancesService,
  ) {}

  private readonly schedulingApproverPermission = 'APPROVE_SCHEDULING';
  private readonly schedulingEditorPermission = 'MANAGE_COMPANIES';
  private readonly schedulingDraftStatus = 'DRAFT';
  private readonly schedulingPendingApprovalStatus = 'PENDING_APPROVAL';
  private readonly schedulingApprovedStatus = 'APPROVED';

  async openSchedulingDay(activityId: string, dateString: string, openedByUserId: string) {
    const dayStart = this.normalizeDate(dateString);
    const dateKey = this.formatDateKey(dayStart);

    const [activity, opener] = await Promise.all([
      this.prisma.activity.findUnique({
        where: { id: activityId },
        select: {
          id: true,
          companyId: true,
          startDate: true,
          endDate: true,
        },
      }),
      this.prisma.user.findUnique({
        where: { id: openedByUserId },
        select: {
          id: true,
          companyId: true,
        },
      }),
    ]);

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    if (!opener || opener.companyId !== activity.companyId) {
      throw new NotFoundException('User not found');
    }

    const startDateKey = this.formatDateKey(activity.startDate);
    const endDateKey = this.formatDateKey(activity.endDate);
    if (dateKey < startDateKey || dateKey > endDateKey) {
      throw new BadRequestException('Date is outside activity boundaries');
    }

    const activityStartDay = this.toDayStart(activity.startDate);
    const shouldCopyFromPreviousDay = dayStart.getTime() > activityStartDay.getTime();

    try {
      await this.prisma.$transaction(async (tx: PrismaService) => {
        const existingSchedulingDay = await tx.activitySchedulingDay.findUnique({
          where: {
            activityId_date: {
              activityId,
              date: dayStart,
            },
          },
          select: { id: true },
        });

        if (existingSchedulingDay) {
          return;
        }

        await tx.activitySchedulingDay.create({
          data: {
            activityId,
            date: dayStart,
            openedByUserId: opener.id,
          },
        });

        if (!shouldCopyFromPreviousDay) {
          return;
        }

        const previousDayStart = new Date(dayStart);
        previousDayStart.setUTCDate(previousDayStart.getUTCDate() - 1);
        const previousDayEnd = new Date(dayStart);

        const previousDayTaskInstances = await tx.taskInstance.findMany({
          where: {
            activityTask: {
              activityId,
            },
            startTime: { lt: previousDayEnd },
            endTime: { gt: previousDayStart },
          },
          select: {
            id: true,
            activityTaskId: true,
            title: true,
            startTime: true,
            endTime: true,
            activityTask: {
              select: {
                activityId: true,
              },
            },
          },
          orderBy: { startTime: 'asc' },
        });

        const dayOffsetMs = dayStart.getTime() - previousDayStart.getTime();

        for (const previousTaskInstance of previousDayTaskInstances) {
          if (previousTaskInstance.activityTask.activityId !== activityId) {
            continue;
          }

          await tx.taskInstance.create({
            data: {
              activityTaskId: previousTaskInstance.activityTaskId,
              title: previousTaskInstance.title,
              startTime: new Date(previousTaskInstance.startTime.getTime() + dayOffsetMs),
              endTime: new Date(previousTaskInstance.endTime.getTime() + dayOffsetMs),
            },
          });
        }
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        return {
          activityId,
          date: dateKey,
          isDayOpened: true,
        };
      }

      throw error;
    }

    return {
      activityId,
      date: dateKey,
      isDayOpened: true,
    };
  }

  async submitSchedulingDayForApproval(activityId: string, dateString: string, userId: string) {
    return this.transitionSchedulingDayStatus(activityId, dateString, userId, this.schedulingPendingApprovalStatus);
  }

  async approveSchedulingDay(activityId: string, dateString: string, userId: string) {
    return this.transitionSchedulingDayStatus(activityId, dateString, userId, this.schedulingApprovedStatus);
  }

  async returnSchedulingDayToDraft(activityId: string, dateString: string, userId: string) {
    return this.transitionSchedulingDayStatus(activityId, dateString, userId, this.schedulingDraftStatus);
  }

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

    const startDateKey = this.formatDateKey(activity.startDate);
    const endDateKey = this.formatDateKey(activity.endDate);
    if (selectedDate < startDateKey || selectedDate > endDateKey) {
      throw new BadRequestException('Date is outside activity boundaries');
    }

    const openedSchedulingDay = await this.prisma.activitySchedulingDay.findUnique({
      where: {
        activityId_date: {
          activityId,
          date: dayStart,
        },
      },
      select: { id: true, approvalStatus: true },
    });

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

    type ManpowerRequirement = { activityTaskId: string; required: boolean; quantity: number };
    type RoleRequirement = {
      activityTaskId: string;
      roleId: string;
      required: boolean;
      quantity: number;
      role: { name: string } | null;
    };
    type QualificationRequirement = {
      activityTaskId: string;
      qualificationId: string;
      required: boolean;
      quantity: number;
      qualification: { name: string } | null;
    };

    const [manpowerRequirements, roleRequirements, qualificationRequirements, validations] = await Promise.all([
      activityTaskIds.length > 0
        ? this.prisma.activityTaskManpowerRequirement.findMany({
            where: { activityTaskId: { in: activityTaskIds } },
            select: { activityTaskId: true, required: true, quantity: true },
          })
        : Promise.resolve<ManpowerRequirement[]>([]),
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
        : Promise.resolve<RoleRequirement[]>([]),
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
        : Promise.resolve<QualificationRequirement[]>([]),
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

    const evaluationByTaskInstanceAndUser = new Map<string, CandidateEvaluationResult>();
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
          userId: assignment.userId,
          severity: 'NORMAL',
          reasonCodes: [],
          reasonMessages: [],
          reasons: [],
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
      isDayOpened: Boolean(openedSchedulingDay),
      schedulingStatus: openedSchedulingDay?.approvalStatus ?? this.schedulingDraftStatus,
      taskInstances: schedulingTaskInstances,
    };
  }

  private async transitionSchedulingDayStatus(
    activityId: string,
    dateString: string,
    userId: string,
    targetStatus: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED',
  ) {
    const dayStart = this.normalizeDate(dateString);
    const dateKey = this.formatDateKey(dayStart);

    const [activity, actor] = await Promise.all([
      this.prisma.activity.findUnique({
        where: { id: activityId },
        select: {
          id: true,
          companyId: true,
          startDate: true,
          endDate: true,
        },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          companyId: true,
        },
      }),
    ]);

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    if (!actor || actor.companyId !== activity.companyId) {
      throw new NotFoundException('User not found');
    }

    const startDateKey = this.formatDateKey(activity.startDate);
    const endDateKey = this.formatDateKey(activity.endDate);
    if (dateKey < startDateKey || dateKey > endDateKey) {
      throw new BadRequestException('Date is outside activity boundaries');
    }

    if (targetStatus === this.schedulingPendingApprovalStatus) {
      await this.ensureUserHasPermission(actor.id, this.schedulingEditorPermission);
    }

    if (targetStatus === this.schedulingApprovedStatus || targetStatus === this.schedulingDraftStatus) {
      await this.ensureUserHasPermission(actor.id, this.schedulingApproverPermission);
    }

    const schedulingDay = await this.prisma.activitySchedulingDay.findUnique({
      where: {
        activityId_date: {
          activityId,
          date: dayStart,
        },
      },
      select: {
        id: true,
        approvalStatus: true,
      },
    });

    if (!schedulingDay) {
      throw new BadRequestException('Scheduling day is not opened');
    }

    if (schedulingDay.approvalStatus === targetStatus) {
      return {
        activityId,
        date: dateKey,
        isDayOpened: true,
        schedulingStatus: targetStatus,
      };
    }

    const isValidTransition =
      (schedulingDay.approvalStatus === this.schedulingDraftStatus && targetStatus === this.schedulingPendingApprovalStatus) ||
      (schedulingDay.approvalStatus === this.schedulingPendingApprovalStatus &&
        (targetStatus === this.schedulingApprovedStatus || targetStatus === this.schedulingDraftStatus));

    if (!isValidTransition) {
      throw new BadRequestException('Invalid scheduling approval transition');
    }

    await this.prisma.activitySchedulingDay.update({
      where: {
        activityId_date: {
          activityId,
          date: dayStart,
        },
      },
      data: {
        approvalStatus: targetStatus,
      },
    });

    return {
      activityId,
      date: dateKey,
      isDayOpened: true,
      schedulingStatus: targetStatus,
    };
  }

  private async ensureUserHasPermission(userId: string, permissionKey: string) {
    const permissions = await this.prisma.userPermission.findMany({
      where: { userId },
      select: { permission: { select: { key: true } } },
    });

    const hasPermission = permissions.some(
      (entry: { permission?: { key?: string } }) => entry.permission?.key === permissionKey,
    );

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }
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

  private isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}