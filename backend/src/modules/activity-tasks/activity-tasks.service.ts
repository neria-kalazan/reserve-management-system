import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateActivityTaskDto } from './dto/create-activity-task.dto';
import { UpdateActivityTaskDto } from './dto/update-activity-task.dto';

@Injectable()
export class ActivityTasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(activityId: string, dto: CreateActivityTaskDto) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: { id: true, status: true },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    if (activity.status === 'CANCELLED') {
      throw new BadRequestException('Cannot create tasks for a cancelled activity');
    }

    return this.prisma.activityTask.create({
      data: {
        activityId,
        name: dto.name,
        description: dto.description ?? null,
      },
    });
  }

  async findAllByActivity(activityId: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: { id: true },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    return this.prisma.activityTask.findMany({
      where: { activityId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const task = await this.prisma.activityTask.findUnique({ where: { id } });

    if (!task) {
      throw new NotFoundException('Activity task not found');
    }

    return task;
  }

  async update(id: string, dto: UpdateActivityTaskDto) {
    const task = await this.prisma.activityTask.findUnique({ where: { id } });

    if (!task) {
      throw new NotFoundException('Activity task not found');
    }

    const data: { name?: string; description?: string | null } = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
    }

    if (dto.description !== undefined) {
      data.description = dto.description ?? null;
    }

    if (Object.keys(data).length === 0) {
      return task;
    }

    return this.prisma.activityTask.update({
      where: { id },
      data,
    });
  }
}
