import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityUserStatusItemDto } from './dto/activity-user-status-item.dto';
import { BulkUpdateActivityUserStatusDto } from './dto/bulk-update-activity-user-status.dto';
import { UpdateActivityUserStatusDto } from './dto/update-activity-user-status.dto';

@Injectable()
export class ActivityUserStatusService {
  constructor(private readonly prisma: PrismaService) {}

  async generateAvailability(activityId: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: { id: true, companyId: true, startDate: true, endDate: true },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    const activeUsers = await this.prisma.user.findMany({
      where: {
        companyId: activity.companyId,
        isActive: true,
      },
      select: { id: true },
      orderBy: { id: 'asc' },
    });

    const start = new Date(activity.startDate);
    const end = new Date(activity.endDate);
    const dates: Date[] = [];
    const current = new Date(start);

    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return this.prisma.$transaction(async (tx: PrismaService) => {
      const created: Array<{ activityId: string; userId: string; date: Date; status: string; availability: string }> = [];

      for (const user of activeUsers) {
        for (const date of dates) {
          const dateOnly = new Date(date);
          dateOnly.setHours(0, 0, 0, 0);

          try {
            const record = await tx.activityUserStatus.create({
              data: {
                activityId,
                userId: user.id,
                date: dateOnly,
                status: 'ACTIVE',
                availability: 'ALL_DAY',
              },
            });
            created.push({ activityId: record.activityId, userId: record.userId, date: record.date, status: record.status, availability: record.availability });
          } catch (error: any) {
            if (error?.code === 'P2002') {
              continue;
            }
            throw error;
          }
        }
      }

      return created;
    });
  }

  async update(id: string, dto: UpdateActivityUserStatusDto): Promise<ActivityUserStatusItemDto> {
    const allowedStatuses = ['ACTIVE', 'HOLIDAY', 'RELEASED', 'SICK'] as const;
    const allowedAvailabilities = ['MORNING', 'EVENING', 'ALL_DAY', 'UNAVAILABLE'] as const;

    if (dto.status !== undefined && !allowedStatuses.includes(dto.status as (typeof allowedStatuses)[number])) {
      throw new BadRequestException('Invalid status');
    }

    if (dto.availability !== undefined && !allowedAvailabilities.includes(dto.availability as (typeof allowedAvailabilities)[number])) {
      throw new BadRequestException('Invalid availability');
    }

    const record = await this.prisma.activityUserStatus.findUnique({
      where: { id },
      select: {
        id: true,
      },
    });

    if (!record) {
      throw new NotFoundException('Activity user status not found');
    }

    return this.prisma.activityUserStatus.update({
      where: { id },
      data: {
        status: dto.status,
        availability: dto.availability,
      },
      select: {
        id: true,
        activityId: true,
        userId: true,
        date: true,
        status: true,
        availability: true,
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

  async bulkUpdate(activityId: string, dto: BulkUpdateActivityUserStatusDto) {
    const allowedAvailabilities = ['MORNING', 'EVENING', 'ALL_DAY', 'UNAVAILABLE'] as const;

    if (!allowedAvailabilities.includes(dto.availability as (typeof allowedAvailabilities)[number])) {
      throw new BadRequestException('Invalid availability');
    }

    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: { id: true, companyId: true, startDate: true, endDate: true },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate < startDate) {
      throw new BadRequestException('endDate must be greater than or equal to startDate');
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: dto.userIds } },
      select: { id: true, companyId: true },
    });

    if (users.length !== dto.userIds.length) {
      throw new BadRequestException('One or more users were not found');
    }

    const invalidUsers = users.filter((user: { companyId: string }) => user.companyId !== activity.companyId);
    if (invalidUsers.length > 0) {
      throw new BadRequestException('One or more users do not belong to the activity company');
    }

    return this.prisma.$transaction(async (tx: PrismaService) => {
      const records = await tx.activityUserStatus.findMany({
        where: {
          activityId,
          userId: { in: dto.userIds },
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          id: true,
          activityId: true,
          userId: true,
          date: true,
          status: true,
          availability: true,
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

      const updatedRecords = [] as ActivityUserStatusItemDto[];

      for (const record of records) {
        const updated = await tx.activityUserStatus.update({
          where: { id: record.id },
          data: { availability: dto.availability },
          select: {
            id: true,
            activityId: true,
            userId: true,
            date: true,
            status: true,
            availability: true,
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

        updatedRecords.push(updated);
      }

      return {
        updatedCount: updatedRecords.length,
        updatedRecords,
      };
    });
  }

  async findAllByActivity(activityId: string): Promise<ActivityUserStatusItemDto[]> {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: { id: true },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    return this.prisma.activityUserStatus.findMany({
      where: { activityId },
      orderBy: [{ date: 'asc' }, { userId: 'asc' }],
      select: {
        id: true,
        activityId: true,
        userId: true,
        date: true,
        status: true,
        availability: true,
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
}
