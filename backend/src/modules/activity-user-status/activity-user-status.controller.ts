import { Controller, Get, Param } from '@nestjs/common';
import { ActivityUserStatusService } from './activity-user-status.service';

@Controller()
export class ActivityUserStatusController {
  constructor(private readonly activityUserStatusService: ActivityUserStatusService) {}

  @Get('activities/:activityId/availability')
  findAllByActivity(@Param('activityId') activityId: string) {
    return this.activityUserStatusService.findAllByActivity(activityId);
  }
}
