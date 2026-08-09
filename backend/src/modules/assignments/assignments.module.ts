import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { TaskValidationService } from '../task-instances/task-validation.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AssignmentsController],
  providers: [AssignmentsService, TaskValidationService],
})
export class AssignmentsModule {}
