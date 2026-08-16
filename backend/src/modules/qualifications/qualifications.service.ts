import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateQualificationDto } from './dto/create-qualification.dto';
import { UpdateQualificationDto } from './dto/update-qualification.dto';
import {
  COMPANY_QUALIFICATION_SORT_FIELD_MAP,
  CompanyQualificationSortField,
  FindCompanyQualificationsQueryDto,
} from './dto/find-company-qualifications-query.dto';

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

  async findAllByCompany(companyId: string, query: FindCompanyQualificationsQueryDto = {}) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const sortBy = (query.sortBy ?? 'name') as CompanyQualificationSortField;
    const sortOrder = query.sortOrder ?? 'asc';
    const prismaSortField = COMPANY_QUALIFICATION_SORT_FIELD_MAP[sortBy];

    const [items, total] = await Promise.all([
      this.prisma.qualification.findMany({
        where: { companyId },
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
        },
        orderBy: { [prismaSortField]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.qualification.count({
        where: { companyId },
      }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
    };
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
