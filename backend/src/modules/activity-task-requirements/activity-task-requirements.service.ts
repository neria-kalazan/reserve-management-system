import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateActivityTaskRequirementsDto } from './dto/update-activity-task-requirements.dto';

@Injectable()
export class ActivityTaskRequirementsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(activityTaskId: string) {
    const task = await this.prisma.activityTask.findUnique({
      where: { id: activityTaskId },
      select: { id: true },
    });

    if (!task) {
      throw new NotFoundException('Activity task not found');
    }

    const [manpower, roles, qualifications] = await Promise.all([
      this.prisma.activityTaskManpowerRequirement.findUnique({ where: { activityTaskId } }),
      this.prisma.activityTaskRoleRequirement.findMany({ where: { activityTaskId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.activityTaskQualificationRequirement.findMany({ where: { activityTaskId }, orderBy: { createdAt: 'asc' } }),
    ]);

    return {
      manpower: manpower
        ? { required: manpower.required, quantity: manpower.quantity }
        : null,
      roles: roles.map((requirement) => ({
        roleId: requirement.roleId,
        required: requirement.required,
        quantity: requirement.quantity,
      })),
      qualifications: qualifications.map((requirement) => ({
        qualificationId: requirement.qualificationId,
        required: requirement.required,
        quantity: requirement.quantity,
      })),
    };
  }

  async replaceRequirements(activityTaskId: string, dto: UpdateActivityTaskRequirementsDto) {
    const task = await this.prisma.activityTask.findUnique({
      where: { id: activityTaskId },
      select: { id: true, activity: { select: { companyId: true } } },
    });

    if (!task) {
      throw new NotFoundException('Activity task not found');
    }

    const companyId = task.activity.companyId;

    if (dto.roles?.length) {
      for (const roleRequirement of dto.roles) {
        const role = await this.prisma.role.findUnique({
          where: { id: roleRequirement.roleId },
          select: { id: true, companyId: true },
        });

        if (!role) {
          throw new NotFoundException(`Role not found: ${roleRequirement.roleId}`);
        }

        if (role.companyId !== companyId) {
          throw new BadRequestException(`Role ${roleRequirement.roleId} does not belong to the activity company`);
        }
      }
    }

    if (dto.qualifications?.length) {
      for (const qualificationRequirement of dto.qualifications) {
        const qualification = await this.prisma.qualification.findUnique({
          where: { id: qualificationRequirement.qualificationId },
          select: { id: true, companyId: true },
        });

        if (!qualification) {
          throw new NotFoundException(`Qualification not found: ${qualificationRequirement.qualificationId}`);
        }

        if (qualification.companyId !== companyId) {
          throw new BadRequestException(`Qualification ${qualificationRequirement.qualificationId} does not belong to the activity company`);
        }
      }
    }

    return this.prisma.$transaction(async (tx: PrismaService) => {
      await tx.activityTaskManpowerRequirement.deleteMany({ where: { activityTaskId } });
      await tx.activityTaskRoleRequirement.deleteMany({ where: { activityTaskId } });
      await tx.activityTaskQualificationRequirement.deleteMany({ where: { activityTaskId } });

      const createdManpower = dto.manpower
        ? await tx.activityTaskManpowerRequirement.create({
            data: {
              activityTaskId,
              required: dto.manpower.required,
              quantity: dto.manpower.quantity,
            },
          })
        : null;

      const createdRoles = dto.roles?.length
        ? await Promise.all(
            dto.roles.map((roleRequirement) =>
              tx.activityTaskRoleRequirement.create({
                data: {
                  activityTaskId,
                  roleId: roleRequirement.roleId,
                  required: roleRequirement.required,
                  quantity: roleRequirement.quantity,
                },
              }),
            ),
          )
        : [];

      const createdQualifications = dto.qualifications?.length
        ? await Promise.all(
            dto.qualifications.map((qualificationRequirement) =>
              tx.activityTaskQualificationRequirement.create({
                data: {
                  activityTaskId,
                  qualificationId: qualificationRequirement.qualificationId,
                  required: qualificationRequirement.required,
                  quantity: qualificationRequirement.quantity,
                },
              }),
            ),
          )
        : [];

      return {
        manpower: createdManpower
          ? { required: createdManpower.required, quantity: createdManpower.quantity }
          : null,
        roles: createdRoles.map((requirement) => ({
          roleId: requirement.roleId,
          required: requirement.required,
          quantity: requirement.quantity,
        })),
        qualifications: createdQualifications.map((requirement) => ({
          qualificationId: requirement.qualificationId,
          required: requirement.required,
          quantity: requirement.quantity,
        })),
      };
    });
  }
}
