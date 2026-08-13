import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { ActivationsModule } from '../activations/activations.module';

@Module({
  imports: [ConfigModule, PrismaModule, forwardRef(() => ActivationsModule)],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, PermissionGuard],
  exports: [AuthService, AuthGuard, PermissionGuard],
})
export class AuthModule {}
