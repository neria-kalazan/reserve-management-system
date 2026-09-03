import { Controller, Get, Patch, Post, Param, Body, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { ActivitySchedulingDayService } from './activity-scheduling-day.service';
import { GetSchedulingDayQueryDto } from './dto/get-scheduling-day-query.dto';
import { OpenSchedulingDayDto } from './dto/open-scheduling-day.dto';

@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@UseGuards(AuthGuard, PermissionGuard)
@RequirePermission('MANAGE_COMPANIES')
@Controller()
export class ActivitiesController {
  constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly activitySchedulingDayService: ActivitySchedulingDayService,
  ) {}

  @Post('companies/:companyId/activities')
  create(@Param('companyId') companyId: string, @Body() dto: CreateActivityDto) {
    return this.activitiesService.create(companyId, dto);
  }

  @Get('companies/:companyId/activities')
  findAllByCompany(@Param('companyId') companyId: string) {
    return this.activitiesService.findAllByCompany(companyId);
  }

  @Get('activities/:id')
  findOne(@Param('id') id: string) {
    return this.activitiesService.findOne(id);
  }

  @Get('activities/:activityId/scheduling/day')
  getSchedulingDay(@Param('activityId') activityId: string, @Query() query: GetSchedulingDayQueryDto) {
    return this.activitySchedulingDayService.getSchedulingDay(activityId, query.date);
  }

  @Post('activities/:activityId/scheduling/day/open')
  openSchedulingDay(
    @Param('activityId') activityId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: OpenSchedulingDayDto,
  ) {
    return this.activitySchedulingDayService.openSchedulingDay(activityId, dto.date, user.id);
  }

  @Post('activities/:activityId/scheduling/day/submit')
  submitSchedulingDayForApproval(
    @Param('activityId') activityId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: OpenSchedulingDayDto,
  ) {
    return this.activitySchedulingDayService.submitSchedulingDayForApproval(activityId, dto.date, user.id);
  }

  @Post('activities/:activityId/scheduling/day/approve')
  @RequirePermission('APPROVE_SCHEDULING')
  approveSchedulingDay(
    @Param('activityId') activityId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: OpenSchedulingDayDto,
  ) {
    return this.activitySchedulingDayService.approveSchedulingDay(activityId, dto.date, user.id);
  }

  @Post('activities/:activityId/scheduling/day/return')
  @RequirePermission('APPROVE_SCHEDULING')
  returnSchedulingDayToDraft(
    @Param('activityId') activityId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: OpenSchedulingDayDto,
  ) {
    return this.activitySchedulingDayService.returnSchedulingDayToDraft(activityId, dto.date, user.id);
  }

  @Patch('activities/:id')
  update(@Param('id') id: string, @Body() dto: UpdateActivityDto) {
    return this.activitiesService.update(id, dto);
  }
}
