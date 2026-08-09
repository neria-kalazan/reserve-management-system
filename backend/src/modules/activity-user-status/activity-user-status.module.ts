import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ActivityUserStatusController } from './activity-user-status.controller';
import { ActivityUserStatusService } from './activity-user-status.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ActivityUserStatusController],
  providers: [ActivityUserStatusService],
  exports: [ActivityUserStatusService],
})
export class ActivityUserStatusModule {}
