import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ActivityTasksController } from './activity-tasks.controller';
import { ActivityTasksService } from './activity-tasks.service';

@Module({
  imports: [PrismaModule],
  controllers: [ActivityTasksController],
  providers: [ActivityTasksService],
  exports: [ActivityTasksService],
})
export class ActivityTasksModule {}
