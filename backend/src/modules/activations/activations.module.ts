import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ActivationsController } from './activations.controller';
import { ActivationsService } from './activations.service';
import { DevelopmentOtpService } from './otp/development-otp.service';
import { OtpService } from './otp/otp.service';

@Module({
  imports: [ConfigModule, PrismaModule, forwardRef(() => AuthModule)],
  controllers: [ActivationsController],
  providers: [
    ActivationsService,
    DevelopmentOtpService,
    {
      provide: OtpService,
      useExisting: DevelopmentOtpService,
    },
  ],
  exports: [ActivationsService],
})
export class ActivationsModule {}