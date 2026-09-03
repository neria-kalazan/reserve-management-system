import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaskInstanceDto } from './dto/create-task-instance.dto';
import { BulkCreateTaskInstancesDto } from './dto/bulk-create-task-instances.dto';
import { UpdateTaskInstanceDto } from './dto/update-task-instance.dto';

export type CandidateEvaluationSeverity = 'NORMAL' | 'WARNING' | 'CRITICAL';

export interface CandidateEvaluationReason {
  code:
    | 'MISSING_REQUIRED_ROLE'
    | 'MISSING_OPTIONAL_ROLE'
    | 'MISSING_REQUIRED_QUALIFICATION'
    | 'MISSING_OPTIONAL_QUALIFICATION'
    | 'USER_STATUS_NOT_ACTIVE'
    | 'UNAVAILABLE_FOR_TIME_WINDOW';
  severity: Exclude<CandidateEvaluationSeverity, 'NORMAL'>;
  message: string;
  roleId?: string;
  roleName?: string;
  qualificationId?: string;
  qualificationName?: string;
}

export interface CandidateEvaluationResult {
  userId: string;
  severity: CandidateEvaluationSeverity;
  reasonCodes: string[];
  reasonMessages: string[];
  reasons: CandidateEvaluationReason[];
}

@Injectable()
export class TaskInstancesService {
  constructor(private readonly prisma: PrismaService) {}

  private validateDateRange(startTime: Date, endTime: Date) {
    if (endTime <= startTime) {
      throw new BadRequestException('endTime must be after startTime');
    }
  }

  private buildDateTime(baseDate: Date, timeString: string) {
    const [hours, minutes] = timeString.split(':').map((part) => Number(part));

    if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new BadRequestException('Invalid time format');
    }

    const result = new Date(baseDate);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  async create(activityTaskId: string, dto: CreateTaskInstanceDto) {
    const activityTask = await this.prisma.activityTask.findUnique({
      where: { id: activityTaskId },
      select: { id: true },
    });

    if (!activityTask) {
      throw new NotFoundException('Activity task not found');
    }

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    this.validateDateRange(startTime, endTime);

    return this.prisma.taskInstance.create({
      data: {
        activityTaskId,
        title: dto.title ?? '',
        startTime,
        endTime,
      },
    });
  }

  async bulkCreate(activityTaskId: string, dto: BulkCreateTaskInstancesDto) {
    const activityTask = await this.prisma.activityTask.findUnique({
      where: { id: activityTaskId },
      select: { id: true, name: true },
    });

    if (!activityTask) {
      throw new NotFoundException('Activity task not found');
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate < startDate) {
      throw new BadRequestException('endDate must be greater than or equal to startDate');
    }

    const createdTaskInstances: Array<{ id: string; activityTaskId: string; title: string; startTime: Date; endTime: Date }> = [];

    return this.prisma.$transaction(async (tx: PrismaService) => {
      const current = new Date(startDate);
      const end = new Date(endDate);

      while (current <= end) {
        const startTime = this.buildDateTime(new Date(current), dto.startTime);
        const endTime = this.buildDateTime(new Date(current), dto.endTime);

        if (endTime <= startTime) {
          const nextDay = new Date(current);
          nextDay.setDate(nextDay.getDate() + 1);
          const overnightEndTime = this.buildDateTime(nextDay, dto.endTime);
          const created = await tx.taskInstance.create({
            data: {
              activityTaskId,
              title: activityTask.name,
              startTime,
              endTime: overnightEndTime,
            },
          });
          createdTaskInstances.push(created);
        } else {
          const created = await tx.taskInstance.create({
            data: {
              activityTaskId,
              title: activityTask.name,
              startTime,
              endTime,
            },
          });
          createdTaskInstances.push(created);
        }

        current.setDate(current.getDate() + 1);
      }

      return {
        createdCount: createdTaskInstances.length,
        createdTaskInstances,
      };
    });
  }

  async findAllByActivityTask(activityTaskId: string) {
    const activityTask = await this.prisma.activityTask.findUnique({
      where: { id: activityTaskId },
      select: { id: true },
    });

    if (!activityTask) {
      throw new NotFoundException('Activity task not found');
    }

    return this.prisma.taskInstance.findMany({
      where: { activityTaskId },
      orderBy: { startTime: 'asc' },
    });
  }

  async findOne(id: string) {
    const taskInstance = await this.prisma.taskInstance.findUnique({ where: { id } });

    if (!taskInstance) {
      throw new NotFoundException('Task instance not found');
    }

    return taskInstance;
  }

  async update(id: string, dto: UpdateTaskInstanceDto) {
    const taskInstance = await this.prisma.taskInstance.findUnique({ where: { id } });

    if (!taskInstance) {
      throw new NotFoundException('Task instance not found');
    }

    const data: { title?: string; startTime?: Date; endTime?: Date } = {};

    if (dto.title !== undefined) {
      data.title = dto.title;
    }

    if (dto.startTime !== undefined) {
      data.startTime = new Date(dto.startTime);
    }

    if (dto.endTime !== undefined) {
      data.endTime = new Date(dto.endTime);
    }

    if (Object.keys(data).length === 0) {
      return taskInstance;
    }

    const startTime = data.startTime ?? taskInstance.startTime;
    const endTime = data.endTime ?? taskInstance.endTime;

    this.validateDateRange(startTime, endTime);

    return this.prisma.taskInstance.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    const taskInstance = await this.prisma.taskInstance.findUnique({ where: { id } });

    if (!taskInstance) {
      throw new NotFoundException('Task instance not found');
    }

    return this.prisma.taskInstance.delete({ where: { id } });
  }

  private toDayStart(date: Date): Date {
    const normalized = new Date(date);
    normalized.setUTCHours(0, 0, 0, 0);
    return normalized;
  }

  private buildCandidateEvaluation(
    taskInstance: { startTime: Date; activityTask: { id: string; activity?: { id?: string; companyId?: string } } },
    user: { id: string; companyId?: string; userRoles: Array<{ roleId: string }>; userQualifications: Array<{ qualificationId: string }> },
    roleRequirements: Array<{ roleId: string; required: boolean; role?: { name: string | null } | null }>,
    qualificationRequirements: Array<{ qualificationId: string; required: boolean; qualification?: { name: string | null } | null }>,
    availabilityRecord: { status: string; availability: string } | null,
  ): CandidateEvaluationResult {
    const reasons: CandidateEvaluationReason[] = [];

    const pushReason = (reason: CandidateEvaluationReason) => {
      reasons.push(reason);
    };

    const availableRoleIds = new Set(user.userRoles.map((relation: { roleId: string }) => relation.roleId));
    for (const requirement of roleRequirements) {
      if (!availableRoleIds.has(requirement.roleId)) {
        pushReason({
          code: requirement.required ? 'MISSING_REQUIRED_ROLE' : 'MISSING_OPTIONAL_ROLE',
          severity: requirement.required ? 'CRITICAL' : 'WARNING',
          message: requirement.required ? 'User is missing a required role' : 'User is missing an optional role',
          roleId: requirement.roleId,
          ...(requirement.role?.name ? { roleName: requirement.role.name } : {}),
        });
      }
    }

    const availableQualificationIds = new Set(user.userQualifications.map((relation: { qualificationId: string }) => relation.qualificationId));
    for (const requirement of qualificationRequirements) {
      if (!availableQualificationIds.has(requirement.qualificationId)) {
        pushReason({
          code: requirement.required ? 'MISSING_REQUIRED_QUALIFICATION' : 'MISSING_OPTIONAL_QUALIFICATION',
          severity: requirement.required ? 'CRITICAL' : 'WARNING',
          message: requirement.required
            ? 'User is missing a required qualification'
            : 'User is missing an optional qualification',
          qualificationId: requirement.qualificationId,
          ...(requirement.qualification?.name ? { qualificationName: requirement.qualification.name } : {}),
        });
      }
    }

    if (availabilityRecord) {
      const taskHour = taskInstance.startTime.getHours();
      const isMorningTask = taskHour < 14;
      const allowedAvailability = isMorningTask ? ['ALL_DAY', 'MORNING'] : ['ALL_DAY', 'EVENING'];

      if (availabilityRecord.status !== 'ACTIVE') {
        pushReason({
          code: 'USER_STATUS_NOT_ACTIVE',
          severity: 'CRITICAL',
          message: 'User status is not active for this task date',
        });
      }

      if (availabilityRecord.availability !== 'ALL_DAY' && !allowedAvailability.includes(availabilityRecord.availability)) {
        pushReason({
          code: 'UNAVAILABLE_FOR_TIME_WINDOW',
          severity: 'WARNING',
          message: 'User is not available for this task time',
        });
      }
    } else {
      pushReason({
        code: 'UNAVAILABLE_FOR_TIME_WINDOW',
        severity: 'WARNING',
        message: 'User is not available for this task time',
      });
    }

    const severity = reasons.some((reason) => reason.severity === 'CRITICAL')
      ? 'CRITICAL'
      : reasons.length > 0
        ? 'WARNING'
        : 'NORMAL';

    return {
      userId: user.id,
      severity,
      reasonCodes: reasons.map((reason) => reason.code),
      reasonMessages: reasons.map((reason) => reason.message),
      reasons,
    };
  }

  async evaluateCandidate(taskInstanceId: string, userId: string) {
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
                companyId: true,
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

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        companyId: true,
        userRoles: { select: { roleId: true } },
        userQualifications: { select: { qualificationId: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.companyId !== activity.companyId) {
      throw new BadRequestException('User does not belong to the task instance company');
    }

    const [roleRequirements, qualificationRequirements, availabilityRecords] = await Promise.all([
      this.prisma.activityTaskRoleRequirement.findMany({
        where: { activityTaskId: taskInstance.activityTask.id },
        select: { roleId: true, required: true, role: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.activityTaskQualificationRequirement.findMany({
        where: { activityTaskId: taskInstance.activityTask.id },
        select: { qualificationId: true, required: true, qualification: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.activityUserStatus.findMany({
        where: {
          activityId: activity.id,
          userId: user.id,
          date: this.toDayStart(taskInstance.startTime),
        },
        select: {
          status: true,
          availability: true,
        },
      }),
    ]);

    return this.buildCandidateEvaluation(taskInstance, user, roleRequirements, qualificationRequirements, availabilityRecords[0] ?? null);
  }

  async findAvailableUsers(taskInstanceId: string) {
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
                companyId: true,
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

    const availabilityDate = new Date(taskInstance.startTime);
    availabilityDate.setUTCHours(0, 0, 0, 0);

    const taskHour = taskInstance.startTime.getHours();
    const isMorningTask = taskHour < 14;

    const [roleRequirementsResult, qualificationRequirementsResult, availabilityRecords, assignedUsers] = await Promise.all([
      (async () => {
        const result = this.prisma.activityTaskRoleRequirement.findMany
          ? await this.prisma.activityTaskRoleRequirement.findMany({
              where: { activityTaskId: taskInstance.activityTask?.id ?? '' },
              select: { roleId: true, required: true },
              orderBy: { createdAt: 'asc' },
            })
          : [];
        return result ?? [];
      })(),
      (async () => {
        const result = this.prisma.activityTaskQualificationRequirement.findMany
          ? await this.prisma.activityTaskQualificationRequirement.findMany({
              where: { activityTaskId: taskInstance.activityTask?.id ?? '' },
              select: { qualificationId: true, required: true },
              orderBy: { createdAt: 'asc' },
            })
          : [];
        return result ?? [];
      })(),
      (async () => {
        const result = this.prisma.activityUserStatus.findMany
          ? await this.prisma.activityUserStatus.findMany({
              where: {
                activityId: activity.id,
                date: availabilityDate,
                status: 'ACTIVE',
              },
              select: {
                userId: true,
                status: true,
                availability: true,
              },
            })
          : [];
        return result ?? [];
      })(),
      (async () => {
        const result = this.prisma.assignment.findMany
          ? await this.prisma.assignment.findMany({
              where: { taskInstanceId },
              select: { userId: true },
            })
          : [];
        return result ?? [];
      })(),
    ]);

    const roleRequirements = roleRequirementsResult ?? [];
    const qualificationRequirements = qualificationRequirementsResult ?? [];

    const assignedIds = new Set(assignedUsers.map((assignment: { userId: string }) => assignment.userId));
    const availabilityByUser = new Map(availabilityRecords.map((record: { userId: string; status: string; availability: string }) => [record.userId, record]));

    const candidateIds = Array.from(availabilityByUser.keys()).filter((userId) => !assignedIds.has(userId));
    const candidateUsersResult = this.prisma.user.findMany
      ? ((await this.prisma.user.findMany({
          where: { id: { in: candidateIds } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            personalNumber: true,
            isActive: true,
            userRoles: { select: { roleId: true } },
            userQualifications: { select: { qualificationId: true } },
          },
        })) ?? [])
      : [];

    const candidateUsers = candidateUsersResult as Array<{ id: string; firstName: string; lastName: string; phone: string | null; email: string | null; personalNumber: string; isActive: boolean; userRoles: Array<{ roleId: string }>; userQualifications: Array<{ qualificationId: string }> }>;

    const normalUserIds = new Set(
      candidateUsers
        .filter((user) => {
          const availabilityRecord = availabilityByUser.get(user.id) ?? null;
          const evaluation = this.buildCandidateEvaluation(
            taskInstance,
            user,
            roleRequirements,
            qualificationRequirements,
            availabilityRecord,
          );
          return evaluation.severity === 'NORMAL';
        })
        .map((user) => user.id),
    );

    return candidateUsers
      .filter((user) => normalUserIds.has(user.id))
      .map((user) => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        email: user.email,
        personalNumber: user.personalNumber,
        isActive: user.isActive,
      }));
  }
}
