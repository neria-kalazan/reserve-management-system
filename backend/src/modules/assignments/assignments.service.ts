import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

@Injectable()
export class AssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(taskInstanceId: string, dto: CreateAssignmentDto) {
    const taskInstance = await this.prisma.taskInstance.findUnique({
      where: { id: taskInstanceId },
      select: { id: true, activityTaskId: true },
    });

    if (!taskInstance) {
      throw new NotFoundException('Task instance not found');
    }

    const activityTask = await this.prisma.activityTask.findUnique({
      where: { id: taskInstance.activityTaskId },
      select: { id: true, activity: { select: { companyId: true } } },
    });

    if (!activityTask) {
      throw new NotFoundException('Activity task not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true, companyId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.companyId !== activityTask.activity.companyId) {
      throw new BadRequestException('User does not belong to the activity company');
    }

    const existingAssignment = await this.prisma.assignment.findUnique({
      where: {
        taskInstanceId_userId: {
          taskInstanceId,
          userId: dto.userId,
        },
      },
      select: { id: true },
    });

    if (existingAssignment) {
      throw new ConflictException('User is already assigned to this task instance');
    }

    return this.prisma.assignment.create({
      data: {
        taskInstanceId,
        userId: dto.userId,
        createdBy: dto.createdBy ?? null,
      },
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
            phone: true,
            email: true,
            personalNumber: true,
            isActive: true,
          },
        },
      },
    });
  }

  async findAllByTaskInstance(taskInstanceId: string) {
    const taskInstance = await this.prisma.taskInstance.findUnique({
      where: { id: taskInstanceId },
      select: { id: true },
    });

    if (!taskInstance) {
      throw new NotFoundException('Task instance not found');
    }

    return this.prisma.assignment.findMany({
      where: { taskInstanceId },
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
            phone: true,
            email: true,
            personalNumber: true,
            isActive: true,
          },
        },
      },
    });
  }

  async delete(id: string) {
    const assignment = await this.prisma.assignment.findUnique({ where: { id } });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    return this.prisma.assignment.delete({ where: { id } });
  }
}
