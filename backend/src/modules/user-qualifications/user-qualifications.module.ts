import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { UserQualificationsController } from './user-qualifications.controller';
import { UserQualificationsService } from './user-qualifications.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [UserQualificationsController],
  providers: [UserQualificationsService],
  exports: [UserQualificationsService],
})
export class UserQualificationsModule {}
