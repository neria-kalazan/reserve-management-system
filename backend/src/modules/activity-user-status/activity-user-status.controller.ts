import { Body, Controller, Get, Param, Patch, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { ActivityUserStatusService } from './activity-user-status.service';
import { BulkUpdateActivityUserStatusDto } from './dto/bulk-update-activity-user-status.dto';
import { UpdateActivityUserStatusDto } from './dto/update-activity-user-status.dto';

@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@Controller()
export class ActivityUserStatusController {
  constructor(private readonly activityUserStatusService: ActivityUserStatusService) {}

  @Get('activities/:activityId/availability')
  findAllByActivity(@Param('activityId') activityId: string) {
    return this.activityUserStatusService.findAllByActivity(activityId);
  }

  @Post('activities/:activityId/availability/generate')
  generateAvailability(@Param('activityId') activityId: string) {
    return this.activityUserStatusService.generateAvailability(activityId);
  }

  @Patch('activity-user-status/:id')
  update(@Param('id') id: string, @Body() dto: UpdateActivityUserStatusDto) {
    return this.activityUserStatusService.update(id, dto);
  }

  @Patch('activities/:activityId/availability/bulk')
  bulkUpdate(@Param('activityId') activityId: string, @Body() dto: BulkUpdateActivityUserStatusDto) {
    return this.activityUserStatusService.bulkUpdate(activityId, dto);
  }
}
