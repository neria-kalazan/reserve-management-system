import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CompanyStatus } from '@prisma/client';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCompanyDto) {
    const { name, ownerUserId } = dto;

    if (ownerUserId) {
      const commander = await this.prisma.user.findUnique({
        where: { id: ownerUserId },
      });

      if (!commander) {
        throw new BadRequestException('Commander user not found');
      }
    }

    return this.prisma.company.create({
      data: {
        name,
        status: CompanyStatus.ACTIVE,
        ownerUserId: ownerUserId ?? null,
      },
      select: {
        id: true,
        name: true,
        status: true,
        ownerUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  findAll() {
    return this.prisma.company.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        ownerUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        status: true,
        ownerUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  async update(id: string, dto: UpdateCompanyDto) {
    const company = await this.prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const data: { name?: string; status?: CompanyStatus } = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
    }

    if (dto.status !== undefined) {
      data.status = dto.status;
    }

    if (Object.keys(data).length === 0) {
      return this.findOne(id);
    }

    return this.prisma.company.update({
      where: { id },
      data,
      include: {
        ownerUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }
}
