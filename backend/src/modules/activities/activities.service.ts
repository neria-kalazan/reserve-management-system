import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityStatus } from '@prisma/client';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, dto: CreateActivityDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate < startDate) {
      throw new BadRequestException('endDate must be greater than or equal to startDate');
    }

    return this.prisma.activity.create({
      data: {
        companyId,
        name: dto.name,
        startDate,
        endDate,
        status: dto.status ?? 'DRAFT',
      },
    });
  }

  async findAllByCompany(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return this.prisma.activity.findMany({
      where: { companyId },
      orderBy: { startDate: 'asc' },
    });
  }

  async findOne(id: string) {
    const activity = await this.prisma.activity.findUnique({ where: { id } });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    return activity;
  }

  async update(id: string, dto: UpdateActivityDto) {
    const activity = await this.prisma.activity.findUnique({ where: { id } });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    const data: { name?: string; startDate?: Date; endDate?: Date; status?: ActivityStatus } = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
    }

    if (dto.startDate !== undefined) {
      data.startDate = new Date(dto.startDate);
    }

    if (dto.endDate !== undefined) {
      data.endDate = new Date(dto.endDate);
    }

    if (dto.status !== undefined) {
      data.status = dto.status;
    }

    if (Object.keys(data).length === 0) {
      return activity;
    }

    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      throw new BadRequestException('endDate must be greater than or equal to startDate');
    }

    if (data.startDate && !data.endDate && activity.endDate < data.startDate) {
      throw new BadRequestException('endDate must be greater than or equal to startDate');
    }

    if (data.endDate && !data.startDate && data.endDate < activity.startDate) {
      throw new BadRequestException('endDate must be greater than or equal to startDate');
    }

    return this.prisma.activity.update({
      where: { id },
      data,
    });
  }
}
