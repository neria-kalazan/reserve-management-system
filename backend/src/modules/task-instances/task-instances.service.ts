import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaskInstanceDto } from './dto/create-task-instance.dto';
import { UpdateTaskInstanceDto } from './dto/update-task-instance.dto';

@Injectable()
export class TaskInstancesService {
  constructor(private readonly prisma: PrismaService) {}

  private validateDateRange(startTime: Date, endTime: Date) {
    if (endTime <= startTime) {
      throw new BadRequestException('endTime must be after startTime');
    }
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

    const availabilityRecords = await this.prisma.activityUserStatus.findMany({
      where: {
        activityId: activity.id,
        date: availabilityDate,
        status: 'ACTIVE',
      },
      select: {
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
      .map((record: { user: any }) => record.user)
      .filter((user: { id: string }) => !assignedIds.has(user.id));
  }
}
