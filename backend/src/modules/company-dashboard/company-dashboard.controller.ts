import { Controller, Get, Param, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/permission.decorator';
import { CompanyDashboardService } from './company-dashboard.service';

@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@UseGuards(AuthGuard, PermissionGuard)
@RequirePermission('MANAGE_COMPANIES')
@Controller('companies')
export class CompanyDashboardController {
  constructor(private readonly companyDashboardService: CompanyDashboardService) {}

  @Get(':companyId/dashboard')
  getDashboard(@Param('companyId') companyId: string) {
    return this.companyDashboardService.getDashboard(companyId);
  }
}
