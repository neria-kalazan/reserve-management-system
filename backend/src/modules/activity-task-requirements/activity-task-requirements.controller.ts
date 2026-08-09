import { Body, Controller, Get, Param, Put, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/permission.decorator';
import { ActivityTaskRequirementsService } from './activity-task-requirements.service';
import { UpdateActivityTaskRequirementsDto } from './dto/update-activity-task-requirements.dto';

@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@UseGuards(AuthGuard, PermissionGuard)
@RequirePermission('MANAGE_COMPANIES')
@Controller()
export class ActivityTaskRequirementsController {
  constructor(private readonly service: ActivityTaskRequirementsService) {}

  @Get('activity-tasks/:activityTaskId/requirements')
  findAll(@Param('activityTaskId') activityTaskId: string) {
    return this.service.findAll(activityTaskId);
  }

  @Put('activity-tasks/:activityTaskId/requirements')
  replaceRequirements(@Param('activityTaskId') activityTaskId: string, @Body() dto: UpdateActivityTaskRequirementsDto) {
    return this.service.replaceRequirements(activityTaskId, dto);
  }
}
