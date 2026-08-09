import { Controller, Get, Param, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/permission.decorator';
import { ActivityOverviewService } from './activity-overview.service';

@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@UseGuards(AuthGuard, PermissionGuard)
@RequirePermission('MANAGE_COMPANIES')
@Controller()
export class ActivityOverviewController {
  constructor(private readonly activityOverviewService: ActivityOverviewService) {}

  @Get('activities/:activityId/overview')
  getOverview(@Param('activityId') activityId: string) {
    return this.activityOverviewService.getOverview(activityId);
  }
}
