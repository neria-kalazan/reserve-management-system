import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaskInstanceDto } from './dto/create-task-instance.dto';
import { BulkCreateTaskInstancesDto } from './dto/bulk-create-task-instances.dto';
import { UpdateTaskInstanceDto } from './dto/update-task-instance.dto';

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
        title: dto.title,
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

  async findAvailableUsers(taskInstanceId: string) {
    const taskInstance = await this.prisma.taskInstance.findUnique({
      where: { id: taskInstanceId },
      select: {
        id: true,
        startTime: true,
        activityTask: {
          select: {
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

    const availabilityRecords = await this.prisma.activityUserStatus.findMany({
      where: {
        activityId: activity.id,
        date: availabilityDate,
        status: 'ACTIVE',
      },
      select: {
        status: true,
        availability: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            personalNumber: true,
            isActive: true,
          },
        },
      },
    });

    const assignedUsers = await this.prisma.assignment.findMany({
      where: { taskInstanceId },
      select: { userId: true },
    });

    const assignedIds = new Set(assignedUsers.map((assignment: { userId: string }) => assignment.userId));

    return availabilityRecords
      .filter((record: { status: string; availability: string; user: any }) => {
        if (record.status !== 'ACTIVE') {
          return false;
        }

        if (record.availability === 'ALL_DAY') {
          return true;
        }

        if (isMorningTask) {
          return record.availability === 'MORNING';
        }

        return record.availability === 'EVENING';
      })
      .map((record: { user: any }) => record.user)
      .filter((user: { id: string }) => !assignedIds.has(user.id));
  }
}
