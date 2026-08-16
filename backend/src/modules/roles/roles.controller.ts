import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/permission.decorator';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { FindCompanyRolesQueryDto } from './dto/find-company-roles-query.dto';

@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@UseGuards(AuthGuard, PermissionGuard)
@RequirePermission('MANAGE_COMPANIES')
@Controller()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post('companies/:companyId/roles')
  create(@Param('companyId') companyId: string, @Body() dto: CreateRoleDto) {
    return this.rolesService.create(companyId, dto);
  }

  @Get('companies/:companyId/roles')
  findAllByCompany(
    @Param('companyId') companyId: string,
    @Query() query: FindCompanyRolesQueryDto,
  ) {
    return this.rolesService.findAllByCompany(companyId, query);
  }

  @Get('roles/:id')
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Patch('roles/:id')
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Delete('roles/:id')
  remove(@Param('id') id: string) {
    return this.rolesService.delete(id);
  }
}
