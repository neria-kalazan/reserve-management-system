import { Module } from '@nestjs/common';
import { ActivityTaskRequirementsController } from './activity-task-requirements.controller';
import { ActivityTaskRequirementsService } from './activity-task-requirements.service';

@Module({
  controllers: [ActivityTaskRequirementsController],
  providers: [ActivityTaskRequirementsService],
})
export class ActivityTaskRequirementsModule {}
