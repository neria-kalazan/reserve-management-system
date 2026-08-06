import { Controller, Post, Get, Delete, Param, ParseUUIDPipe } from '@nestjs/common';
import { UserRolesService } from './user-roles.service';

@Controller()
export class UserRolesController {
  constructor(private readonly userRolesService: UserRolesService) {}

  @Post('users/:userId/roles/:roleId')
  assign(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Param('roleId', new ParseUUIDPipe()) roleId: string,
  ) {
    return this.userRolesService.assign(userId, roleId);
  }

  @Get('users/:userId/roles')
  findAll(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.userRolesService.findAll(userId);
  }

  @Delete('users/:userId/roles/:roleId')
  remove(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Param('roleId', new ParseUUIDPipe()) roleId: string,
  ) {
    return this.userRolesService.remove(userId, roleId);
  }
}
