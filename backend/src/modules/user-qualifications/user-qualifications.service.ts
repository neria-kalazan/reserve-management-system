import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UserQualificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async assign(userId: string, qualificationId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, companyId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const qualification = await this.prisma.qualification.findUnique({
      where: { id: qualificationId },
      select: { id: true, companyId: true },
    });

    if (!qualification) {
      throw new NotFoundException('Qualification not found');
    }

    if (user.companyId !== qualification.companyId) {
      throw new BadRequestException('User and qualification belong to different companies');
    }

    try {
      return await this.prisma.userQualification.create({
        data: {
          userId,
          qualificationId,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('User already has this qualification');
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

    return this.prisma.userQualification.findMany({
      where: { userId },
      select: {
        qualification: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    }).then((relations) => relations.map((relation) => relation.qualification));
  }

  async remove(userId: string, qualificationId: string) {
    const relation = await this.prisma.userQualification.findUnique({
      where: {
        userId_qualificationId: {
          userId,
          qualificationId,
        },
      },
      select: { userId: true, qualificationId: true },
    });

    if (!relation) {
      throw new NotFoundException('User qualification relation not found');
    }

    return this.prisma.userQualification.delete({
      where: {
        userId_qualificationId: {
          userId,
          qualificationId,
        },
      },
    });
  }
}
