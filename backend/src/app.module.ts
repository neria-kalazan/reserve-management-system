import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { UnitsModule } from './modules/units/units.module';
import { RolesModule } from './modules/roles/roles.module';
import { QualificationsModule } from './modules/qualifications/qualifications.module';
import { UsersModule } from './modules/users/users.module';
import { UserRolesModule } from './modules/user-roles/user-roles.module';
import { UserQualificationsModule } from './modules/user-qualifications/user-qualifications.module';
import { UserPermissionsModule } from './modules/user-permissions/user-permissions.module';
import { UserImportModule } from './modules/user-import/user-import.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { ActivityTasksModule } from './modules/activity-tasks/activity-tasks.module';
import { ActivityTaskRequirementsModule } from './modules/activity-task-requirements/activity-task-requirements.module';
import { TaskInstancesModule } from './modules/task-instances/task-instances.module';
import { ActivityUserStatusModule } from './modules/activity-user-status/activity-user-status.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { CompanyDashboardModule } from './modules/company-dashboard/company-dashboard.module';
import { ActivityOverviewModule } from './modules/activity-overview/activity-overview.module';
import { TaskWorkspaceModule } from './modules/task-workspace/task-workspace.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CompaniesModule,
    UnitsModule,
    RolesModule,
    QualificationsModule,
    UsersModule,
    UserRolesModule,
    UserQualificationsModule,
    UserPermissionsModule,
    UserImportModule,
    ActivitiesModule,
    ActivityTasksModule,
    ActivityTaskRequirementsModule,
    TaskInstancesModule,
    ActivityUserStatusModule,
    AssignmentsModule,
    CompanyDashboardModule,
    ActivityOverviewModule,
    TaskWorkspaceModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
