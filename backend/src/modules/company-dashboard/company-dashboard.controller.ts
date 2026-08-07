import { Controller, Get, Param, UsePipes, ValidationPipe } from '@nestjs/common';
import { CompanyDashboardService } from './company-dashboard.service';

@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@Controller('companies')
export class CompanyDashboardController {
  constructor(private readonly companyDashboardService: CompanyDashboardService) {}

  @Get(':companyId/dashboard')
  getDashboard(@Param('companyId') companyId: string) {
    return this.companyDashboardService.getDashboard(companyId);
  }
}
