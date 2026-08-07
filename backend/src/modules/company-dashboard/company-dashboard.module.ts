import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CompanyDashboardController } from './company-dashboard.controller';
import { CompanyDashboardService } from './company-dashboard.service';
import { TaskValidationService } from '../task-instances/task-validation.service';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyDashboardController],
  providers: [CompanyDashboardService, TaskValidationService],
  exports: [CompanyDashboardService],
})
export class CompanyDashboardModule {}
