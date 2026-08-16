import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, dto: CreateUserDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const unit = await this.prisma.unit.findUnique({
      where: { id: dto.unitId },
      select: { id: true, companyId: true },
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    if (unit.companyId !== companyId) {
      throw new BadRequestException('Unit does not belong to the specified company');
    }

    try {
      return await this.prisma.user.create({
        data: {
          companyId,
          unitId: dto.unitId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          email: dto.email ?? null,
          personalNumber: dto.personalNumber,
          isActive: true,
        },
        include: {
          unit: {
            select: {
              id: true,
              name: true,
              description: true,
              displayOrder: true,
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('personalNumber must be unique within the company');
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

    return this.prisma.user.findMany({
      where: { companyId, isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        personalNumber: true,
        isActive: true,
        unit: {
          select: {
            id: true,
            name: true,
            description: true,
            displayOrder: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        personalNumber: true,
        isActive: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        unit: {
          select: {
            id: true,
            name: true,
            description: true,
            displayOrder: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, companyId: true, unitId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      email?: string | null;
      unitId?: string;
      isActive?: boolean;
    } = {};

    if (dto.firstName !== undefined) {
      data.firstName = dto.firstName;
    }

    if (dto.lastName !== undefined) {
      data.lastName = dto.lastName;
    }

    if (dto.phone !== undefined) {
      data.phone = dto.phone;
    }

    if (dto.email !== undefined) {
      data.email = dto.email ?? null;
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    if (dto.unitId !== undefined) {
      const unit = await this.prisma.unit.findUnique({
        where: { id: dto.unitId },
        select: { id: true, companyId: true },
      });

      if (!unit) {
        throw new NotFoundException('Unit not found');
      }

      if (unit.companyId !== user.companyId) {
        throw new BadRequestException('Unit does not belong to the user\'s company');
      }

      data.unitId = dto.unitId;
    }

    if (Object.keys(data).length === 0) {
      return this.findOne(id);
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          personalNumber: true,
          isActive: true,
          company: {
            select: {
              id: true,
              name: true,
            },
          },
          unit: {
            select: {
              id: true,
              name: true,
              description: true,
              displayOrder: true,
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('personalNumber must be unique within the company');
      }
      throw error;
    }
  }
}
