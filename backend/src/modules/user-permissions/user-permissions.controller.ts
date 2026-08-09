import { Controller, Post, Get, Delete, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/permission.decorator';
import { UserPermissionsService } from './user-permissions.service';

@UseGuards(AuthGuard, PermissionGuard)
@RequirePermission('MANAGE_COMPANIES')
@Controller()
export class UserPermissionsController {
  constructor(private readonly userPermissionsService: UserPermissionsService) {}

  @Post('users/:userId/permissions/:permissionId')
  assign(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Param('permissionId', new ParseUUIDPipe()) permissionId: string,
  ) {
    return this.userPermissionsService.assign(userId, permissionId);
  }

  @Get('users/:userId/permissions')
  findAll(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.userPermissionsService.findAll(userId);
  }

  @Delete('users/:userId/permissions/:permissionId')
  remove(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Param('permissionId', new ParseUUIDPipe()) permissionId: string,
  ) {
    return this.userPermissionsService.remove(userId, permissionId);
  }
}
