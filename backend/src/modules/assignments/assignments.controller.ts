import { Body, Controller, Delete, Get, Param, Post, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/permission.decorator';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@UseGuards(AuthGuard, PermissionGuard)
@RequirePermission('MANAGE_COMPANIES')
@Controller()
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post('task-instances/:taskInstanceId/assignments')
  create(@Param('taskInstanceId') taskInstanceId: string, @Body() dto: CreateAssignmentDto) {
    return this.assignmentsService.create(taskInstanceId, dto);
  }

  @Get('task-instances/:taskInstanceId/assignments')
  findAllByTaskInstance(@Param('taskInstanceId') taskInstanceId: string) {
    return this.assignmentsService.findAllByTaskInstance(taskInstanceId);
  }

  @Delete('assignments/:id')
  delete(@Param('id') id: string) {
    return this.assignmentsService.delete(id);
  }
}
