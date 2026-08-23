import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityUserStatusItemDto } from './dto/activity-user-status-item.dto';
import { BulkUpdateActivityUserStatusDto } from './dto/bulk-update-activity-user-status.dto';
import { CreateOrUpdateActivityUserStatusCellDto } from './dto/cell-status.dto';
import { PersonnelStatusMatrixResponseDto } from './dto/personnel-status-matrix.dto';
import { UpdateActivityUserStatusDto } from './dto/update-activity-user-status.dto';

@Injectable()
export class ActivityUserStatusService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeDate(date: string): Date {
    const trimmed = String(date).trim();
    const dateOnly = trimmed.includes('T') ? trimmed.slice(0, 10) : trimmed;
    const [year, month, day] = dateOnly.split('-').map(Number);

    if (!year || !month || !day) {
      return new Date(trimmed);
    }

    return new Date(Date.UTC(year, month - 1, day));
  }

  private validateStatus(status: string | undefined) {
    const allowedStatuses = ['ACTIVE', 'HOLIDAY', 'RELEASED', 'SICK'] as const;

    if (status !== undefined && !allowedStatuses.includes(status as (typeof allowedStatuses)[number])) {
      throw new BadRequestException('Invalid status');
    }
  }

  private async assertActivityAndUserMatchCompany(activityId: string, userId: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: { id: true, companyId: true },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, companyId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.companyId !== activity.companyId) {
      throw new BadRequestException('User does not belong to the activity company');
    }

    return { activity, user };
  }

  async createForUser(activityId: string, userId: string, dto: CreateOrUpdateActivityUserStatusCellDto) {
    this.validateStatus(dto.status);
    await this.assertActivityAndUserMatchCompany(activityId, userId);

    const date = this.normalizeDate(dto.date);

    try {
      return await this.prisma.activityUserStatus.create({
        data: {
          activityId,
          userId,
          date,
          status: dto.status,
          availability: 'ALL_DAY',
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
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new BadRequestException('Activity user status already exists for this user and date');
      }
      throw error;
    }
  }

  async updateForUser(activityId: string, userId: string, dateString: string, dto: Partial<CreateOrUpdateActivityUserStatusCellDto>) {
    this.validateStatus(dto.status);
    await this.assertActivityAndUserMatchCompany(activityId, userId);

    const date = this.normalizeDate(dateString);

    const record = await this.prisma.activityUserStatus.findUnique({
      where: {
        activityId_userId_date: {
          activityId,
          userId,
          date,
        },
      },
      select: { id: true },
    });

    if (!record) {
      throw new NotFoundException('Activity user status not found');
    }

    return this.prisma.activityUserStatus.update({
      where: { id: record.id },
      data: {
        status: dto.status,
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

  async deleteForUser(activityId: string, userId: string, dateString: string) {
    await this.assertActivityAndUserMatchCompany(activityId, userId);

    const date = this.normalizeDate(dateString);

    const record = await this.prisma.activityUserStatus.findUnique({
      where: {
        activityId_userId_date: {
          activityId,
          userId,
          date,
        },
      },
      select: { id: true },
    });

    if (!record) {
      throw new NotFoundException('Activity user status not found');
    }

    return this.prisma.activityUserStatus.delete({
      where: { id: record.id },
      select: { id: true },
    });
  }

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

  private formatDateKey(date: Date): string {
    const normalized = new Date(date);
    normalized.setUTCHours(0, 0, 0, 0);
    const year = normalized.getUTCFullYear();
    const month = String(normalized.getUTCMonth() + 1).padStart(2, '0');
    const day = String(normalized.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private generateInclusiveDateKeys(startDate: Date, endDate: Date): string[] {
    const keys: string[] = [];
    const current = new Date(startDate);
    current.setUTCHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setUTCHours(0, 0, 0, 0);

    while (current <= end) {
      keys.push(this.formatDateKey(current));
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return keys;
  }

  async getPersonnelStatusMatrix(activityId: string, companyId: string): Promise<PersonnelStatusMatrixResponseDto> {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: {
        id: true,
        name: true,
        companyId: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    if (activity.companyId !== companyId) {
      throw new ForbiddenException('Activity does not belong to the authenticated company');
    }

    const [users, activityUserStatuses] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          companyId: activity.companyId,
          isActive: true,
        },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          personalNumber: true,
          phone: true,
          email: true,
          isActive: true,
        },
      }),
      this.prisma.activityUserStatus.findMany({
        where: {
          activityId,
          date: {
            gte: new Date(activity.startDate),
            lte: new Date(activity.endDate),
          },
        },
        select: {
          userId: true,
          date: true,
          status: true,
        },
      }),
    ]);

    const start = new Date(activity.startDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(activity.endDate);
    end.setUTCHours(23, 59, 59, 999);
    const dates = this.generateInclusiveDateKeys(start, end);

    const activeUsers = users.filter((user) => user.isActive !== false);
    const statusByUserDate = new Map<string, string>();
    for (const record of activityUserStatuses) {
      const key = `${record.userId}:${this.formatDateKey(new Date(record.date))}`;
      statusByUserDate.set(key, record.status);
    }

    const dailySummaryMap = new Map<string, { activeCount: number; holidayCount: number; sickCount: number; releasedCount: number; yamam: number }>();
    for (const dateKey of dates) {
      dailySummaryMap.set(dateKey, { activeCount: 0, holidayCount: 0, sickCount: 0, releasedCount: 0, yamam: 0 });
    }

    const rows = activeUsers.map((user) => {
      const cells: Record<string, 'ACTIVE' | 'HOLIDAY' | 'SICK' | 'RELEASED' | null> = {};
      let activeCount = 0;
      let holidayCount = 0;
      let sickCount = 0;
      let releasedCount = 0;

      for (const dateKey of dates) {
        const status = statusByUserDate.get(`${user.id}:${dateKey}`) as 'ACTIVE' | 'HOLIDAY' | 'SICK' | 'RELEASED' | undefined;
        cells[dateKey] = status ?? null;

        if (status === 'ACTIVE') activeCount += 1;
        if (status === 'HOLIDAY') holidayCount += 1;
        if (status === 'SICK') sickCount += 1;
        if (status === 'RELEASED') releasedCount += 1;

        const daily = dailySummaryMap.get(dateKey);
        if (daily && status) {
          if (status === 'ACTIVE') daily.activeCount += 1;
          if (status === 'HOLIDAY') daily.holidayCount += 1;
          if (status === 'SICK') daily.sickCount += 1;
          if (status === 'RELEASED') daily.releasedCount += 1;
          daily.yamam = daily.activeCount + daily.holidayCount + daily.sickCount;
        }
      }

      const yamam = activeCount + holidayCount + sickCount;
      const complete = dates.every((dateKey) => cells[dateKey] !== null);

      return {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          personalNumber: user.personalNumber,
          phone: user.phone,
          email: user.email,
          isActive: user.isActive,
        },
        cells,
        summary: {
          activeCount,
          holidayCount,
          sickCount,
          releasedCount,
          yamam,
          complete,
        },
      };
    });

    const dailySummary = dates.map((dateKey) => {
      const entry = dailySummaryMap.get(dateKey)!;
      return {
        date: dateKey,
        activeCount: entry.activeCount,
        holidayCount: entry.holidayCount,
        sickCount: entry.sickCount,
        releasedCount: entry.releasedCount,
        yamam: entry.yamam,
      };
    });

    return {
      activity: {
        id: activity.id,
        name: activity.name,
        startDate: this.formatDateKey(new Date(activity.startDate)),
        endDate: this.formatDateKey(new Date(activity.endDate)),
        companyId: activity.companyId,
      },
      dates,
      rows,
      dailySummary,
    };
  }
}
