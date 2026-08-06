import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityUserStatusItemDto } from './dto/activity-user-status-item.dto';

@Injectable()
export class ActivityUserStatusService {
  constructor(private readonly prisma: PrismaService) {}

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
