import { Controller, Get, Param, UsePipes, ValidationPipe } from '@nestjs/common';
import { ActivityOverviewService } from './activity-overview.service';

@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@Controller()
export class ActivityOverviewController {
  constructor(private readonly activityOverviewService: ActivityOverviewService) {}

  @Get('activities/:activityId/overview')
  getOverview(@Param('activityId') activityId: string) {
    return this.activityOverviewService.getOverview(activityId);
  }
}
