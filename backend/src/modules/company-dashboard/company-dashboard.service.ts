import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CompanyDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(companyId: string) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const now = new Date();

    const [companyUsers, roleHolders, activities] = await Promise.all([
      this.prisma.user.findMany({
        where: { companyId },
        select: {
          id: true,
          isActive: true,
          userRoles: { select: { roleId: true } },
          userQualifications: { select: { qualificationId: true } },
        },
      }),
      this.prisma.userRole.findMany({
        where: {
          user: {
            companyId,
            isActive: true,
          },
        },
        select: {
          roleId: true,
          userId: true,
          role: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              unit: {
                select: {
                  id: true,
                  name: true,
                  displayOrder: true,
                },
              },
            },
          },
        },
        orderBy: [
          { user: { unit: { displayOrder: 'asc' } } },
          { user: { firstName: 'asc' } },
          { user: { lastName: 'asc' } },
          { role: { name: 'asc' } },
          { userId: 'asc' },
        ],
      }),
      this.prisma.activity.findMany({
        where: { companyId },
        select: {
          id: true,
          name: true,
          type: true,
          startDate: true,
          endDate: true,
          status: true,
        },
        orderBy: { startDate: 'asc' },
      }),
    ]);

    const activeUsers = companyUsers.filter((user) => user.isActive);
    const totalSoldiers = activeUsers.length;

    const roleCounts = await this.prisma.role.findMany({
      where: { companyId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    const qualificationCounts = await this.prisma.qualification.findMany({
      where: { companyId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    const roleCountMap = new Map<string, number>();
    for (const user of activeUsers) {
      for (const relation of user.userRoles) {
        roleCountMap.set(relation.roleId, (roleCountMap.get(relation.roleId) ?? 0) + 1);
      }
    }

    const qualificationCountMap = new Map<string, number>();
    for (const user of activeUsers) {
      for (const relation of user.userQualifications) {
        qualificationCountMap.set(relation.qualificationId, (qualificationCountMap.get(relation.qualificationId) ?? 0) + 1);
      }
    }

    const upcomingActivities = activities
      .filter((activity) => activity.status !== 'CANCELLED' && (activity.status === 'ACTIVE' || new Date(activity.startDate) >= now))
      .slice()
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 5);

    const recentActivities = activities
      .filter((activity) => activity.status === 'COMPLETED' || new Date(activity.endDate) <= now)
      .slice()
      .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
      .slice(0, 5);

    const roleHoldersData = (roleHolders ?? []).map((relation) => ({
      roleId: relation.role.id,
      roleName: relation.role.name,
      holderId: relation.user.id,
      holderFirstName: relation.user.firstName,
      holderLastName: relation.user.lastName,
      unitId: relation.user.unit.id,
      unitName: relation.user.unit.name,
      unitDisplayOrder: relation.user.unit.displayOrder,
    }));

    return {
      companySummary: {
        totalSoldiers,
        qualificationCounts: qualificationCounts
          .map((qualification) => ({
            name: qualification.name,
            count: qualificationCountMap.get(qualification.id) ?? 0,
          }))
          .filter((item) => item.count > 0),
        roleCounts: roleCounts
          .map((role) => ({
            name: role.name,
            count: roleCountMap.get(role.id) ?? 0,
          }))
          .filter((item) => item.count > 0),
      },
      roleHolders: roleHoldersData,
      upcomingActivities,
      recentActivities,
    };
  }
}
