import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityUserStatusItemDto } from './dto/activity-user-status-item.dto';

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
      const created: Array<{ activityId: string; userId: string; date: Date; status: string }> = [];

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
              },
            });
            created.push({ activityId: record.activityId, userId: record.userId, date: record.date, status: record.status });
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
