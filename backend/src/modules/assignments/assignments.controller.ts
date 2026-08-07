import { Body, Controller, Delete, Get, Param, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
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
