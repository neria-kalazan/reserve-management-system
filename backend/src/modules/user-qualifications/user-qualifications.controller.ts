import { Controller, Post, Get, Delete, Param, ParseUUIDPipe } from '@nestjs/common';
import { UserQualificationsService } from './user-qualifications.service';

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
