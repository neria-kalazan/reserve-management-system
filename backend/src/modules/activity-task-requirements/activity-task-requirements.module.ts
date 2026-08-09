import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ActivityTaskRequirementsController } from './activity-task-requirements.controller';
import { ActivityTaskRequirementsService } from './activity-task-requirements.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ActivityTaskRequirementsController],
  providers: [ActivityTaskRequirementsService],
})
export class ActivityTaskRequirementsModule {}
