import { Controller, Post, Get, Delete, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/permission.decorator';
import { UserQualificationsService } from './user-qualifications.service';

@UseGuards(AuthGuard, PermissionGuard)
@RequirePermission('MANAGE_COMPANIES')
@Controller()
export class UserQualificationsController {
  constructor(private readonly userQualificationsService: UserQualificationsService) {}

  @Post('users/:userId/qualifications/:qualificationId')
  assign(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Param('qualificationId', new ParseUUIDPipe()) qualificationId: string,
  ) {
    return this.userQualificationsService.assign(userId, qualificationId);
  }

  @Get('users/:userId/qualifications')
  findAll(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.userQualificationsService.findAll(userId);
  }

  @Delete('users/:userId/qualifications/:qualificationId')
  remove(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Param('qualificationId', new ParseUUIDPipe()) qualificationId: string,
  ) {
    return this.userQualificationsService.remove(userId, qualificationId);
  }
}
