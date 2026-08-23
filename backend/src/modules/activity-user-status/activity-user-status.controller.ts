import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedBusinessUser } from '../auth/authenticated-user.interface';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/permission.decorator';
import { ActivityUserStatusService } from './activity-user-status.service';
import { BulkUpdateActivityUserStatusDto } from './dto/bulk-update-activity-user-status.dto';
import { CreateOrUpdateActivityUserStatusCellDto } from './dto/cell-status.dto';
import { UpdateActivityUserStatusDto } from './dto/update-activity-user-status.dto';

@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@UseGuards(AuthGuard, PermissionGuard)
@RequirePermission('MANAGE_COMPANIES')
@Controller()
export class ActivityUserStatusController {
  constructor(private readonly activityUserStatusService: ActivityUserStatusService) {}

  @Get('activities/:activityId/availability')
  findAllByActivity(@Param('activityId') activityId: string) {
    return this.activityUserStatusService.findAllByActivity(activityId);
  }

  @Get('activities/:activityId/personnel-status-matrix')
  getPersonnelStatusMatrix(@Param('activityId') activityId: string, @Req() req: Request & { user?: AuthenticatedBusinessUser }) {
    const companyId = req.user?.companyId;
    if (!companyId) {
      throw new Error('Authenticated company context is required');
    }

    return this.activityUserStatusService.getPersonnelStatusMatrix(activityId, companyId);
  }

  @Post('activities/:activityId/availability/generate')
  generateAvailability(@Param('activityId') activityId: string) {
    return this.activityUserStatusService.generateAvailability(activityId);
  }

  @Post('activities/:activityId/users/:userId/status')
  createForUser(@Param('activityId') activityId: string, @Param('userId') userId: string, @Body() dto: CreateOrUpdateActivityUserStatusCellDto) {
    return this.activityUserStatusService.createForUser(activityId, userId, dto);
  }

  @Patch('activities/:activityId/users/:userId/status')
  updateForUser(@Param('activityId') activityId: string, @Param('userId') userId: string, @Body() dto: CreateOrUpdateActivityUserStatusCellDto) {
    return this.activityUserStatusService.updateForUser(activityId, userId, dto.date, dto);
  }

  @Delete('activities/:activityId/users/:userId/status')
  deleteForUser(@Param('activityId') activityId: string, @Param('userId') userId: string, @Query('date') date: string) {
    return this.activityUserStatusService.deleteForUser(activityId, userId, date);
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
