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
}
