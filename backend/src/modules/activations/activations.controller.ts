import { Body, Controller, Get, Param, Post, Res, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { ActivationsService } from './activations.service';
import { CreateActivationDto } from './dto/create-activation.dto';
import { VerifyActivationPhoneDto } from './dto/verify-activation-phone.dto';
import { VerifyActivationOtpDto } from './dto/verify-activation-otp.dto';

@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@Controller('activations')
export class ActivationsController {
  constructor(private readonly activationsService: ActivationsService) {}

  @Get(':token')
  inspect(@Param('token') token: string) {
    return this.activationsService.inspectActivation(token);
  }

  @Get(':token/link-google')
  async linkGoogle(@Param('token') token: string, @Res() response: Response) {
    response.redirect(await this.activationsService.startGoogleLinking(token));
  }

  @Post(':token/verify-phone')
  verifyPhone(@Param('token') token: string, @Body() dto: VerifyActivationPhoneDto) {
    return this.activationsService.verifyActivationPhone(token, dto.phone);
  }

  @Post(':token/request-otp')
  requestOtp(@Param('token') token: string) {
    return this.activationsService.requestOtp(token);
  }

  @Post(':token/verify-otp')
  verifyOtp(@Param('token') token: string, @Body() dto: VerifyActivationOtpDto) {
    return this.activationsService.verifyOtp(token, dto.otp);
  }

  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermission('MANAGE_COMPANIES')
  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateActivationDto) {
    return this.activationsService.createActivation(user.id, dto.userId);
  }
}