import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateQualificationDto } from './dto/create-qualification.dto';
import { UpdateQualificationDto } from './dto/update-qualification.dto';

@Injectable()
export class QualificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, dto: CreateQualificationDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    try {
      return await this.prisma.qualification.create({
        data: {
          companyId,
          name: dto.name,
          description: dto.description ?? null,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A qualification with this name already exists for the company');
      }
      throw error;
    }
  }

  async findAllByCompany(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return this.prisma.qualification.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const qualification = await this.prisma.qualification.findUnique({
      where: { id },
    });

    if (!qualification) {
      throw new NotFoundException('Qualification not found');
    }

    return qualification;
  }

  async update(id: string, dto: UpdateQualificationDto) {
    const qualification = await this.prisma.qualification.findUnique({
      where: { id },
    });

    if (!qualification) {
      throw new NotFoundException('Qualification not found');
    }

    const data: { name?: string; description?: string | null } = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
    }

    if (dto.description !== undefined) {
      data.description = dto.description;
    }

    if (Object.keys(data).length === 0) {
      return qualification;
    }

    try {
      return await this.prisma.qualification.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A qualification with this name already exists for the company');
      }
      throw error;
    }
  }

  async delete(id: string) {
    const qualification = await this.prisma.qualification.findUnique({
      where: { id },
    });

    if (!qualification) {
      throw new NotFoundException('Qualification not found');
    }

    return this.prisma.qualification.delete({
      where: { id },
    });
  }
}
