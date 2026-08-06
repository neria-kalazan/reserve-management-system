import { Controller, Get, Post, Patch, Param, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('companies/:companyId/users')
  create(@Param('companyId') companyId: string, @Body() dto: CreateUserDto) {
    return this.usersService.create(companyId, dto);
  }

  @Get('companies/:companyId/users')
  findAllByCompany(@Param('companyId') companyId: string) {
    return this.usersService.findAllByCompany(companyId);
  }

  @Get('users/:id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch('users/:id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }
}
