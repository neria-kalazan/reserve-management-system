import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ActivityUserStatusController } from './activity-user-status.controller';
import { ActivityUserStatusService } from './activity-user-status.service';

@Module({
  imports: [PrismaModule],
  controllers: [ActivityUserStatusController],
  providers: [ActivityUserStatusService],
  exports: [ActivityUserStatusService],
})
export class ActivityUserStatusModule {}
