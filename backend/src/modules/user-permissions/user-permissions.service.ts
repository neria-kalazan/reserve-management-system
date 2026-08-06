import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UserPermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async assign(userId: string, permissionId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const permission = await this.prisma.permission.findUnique({
      where: { id: permissionId },
      select: { id: true },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    try {
      return await this.prisma.userPermission.create({
        data: {
          userId,
          permissionId,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('User already has this permission');
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

    return this.prisma.userPermission.findMany({
      where: { userId },
      select: {
        permission: {
          select: {
            id: true,
            key: true,
            description: true,
          },
        },
      },
    }).then((relations) => relations.map((relation) => relation.permission));
  }

  async remove(userId: string, permissionId: string) {
    const relation = await this.prisma.userPermission.findUnique({
      where: {
        userId_permissionId: {
          userId,
          permissionId,
        },
      },
      select: { userId: true, permissionId: true },
    });

    if (!relation) {
      throw new NotFoundException('User permission relation not found');
    }

    return this.prisma.userPermission.delete({
      where: {
        userId_permissionId: {
          userId,
          permissionId,
        },
      },
    });
  }
}
