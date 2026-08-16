import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { FindCompanyRolesQueryDto, CompanyRoleSortField } from './dto/find-company-roles-query.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, dto: CreateRoleDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    try {
      return await this.prisma.role.create({
        data: {
          companyId,
          name: dto.name,
          description: dto.description ?? null,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A role with this name already exists for the company');
      }
      throw error;
    }
  }

  async findAllByCompany(companyId: string, query: FindCompanyRolesQueryDto = {}) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const sortBy = (query.sortBy ?? 'name') as CompanyRoleSortField;
    const sortOrder = query.sortOrder ?? 'asc';

    const [items, total] = await Promise.all([
      this.prisma.role.findMany({
        where: { companyId },
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.role.count({
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
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const data: { name?: string; description?: string | null } = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
    }

    if (dto.description !== undefined) {
      data.description = dto.description;
    }

    if (Object.keys(data).length === 0) {
      return role;
    }

    try {
      return await this.prisma.role.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A role with this name already exists for the company');
      }
      throw error;
    }
  }

  async delete(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return this.prisma.role.delete({
      where: { id },
    });
  }
}
