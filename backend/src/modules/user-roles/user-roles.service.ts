import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UserRolesService {
  constructor(private readonly prisma: PrismaService) {}

  async assign(userId: string, roleId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, companyId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true, companyId: true },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (user.companyId !== role.companyId) {
      throw new BadRequestException('User and role belong to different companies');
    }

    try {
      return await this.prisma.userRole.create({
        data: {
          userId,
          roleId,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('User already has this role');
      }
      throw error;
    }
  }

  async findAll(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.userRole.findMany({
      where: { userId },
      select: {
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    }).then((relations) => relations.map((relation) => relation.role));
  }

  async remove(userId: string, roleId: string) {
    const relation = await this.prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
      select: { userId: true, roleId: true },
    });

    if (!relation) {
      throw new NotFoundException('User role relation not found');
    }

    return this.prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });
  }
}
