import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyActivationOtpDto {
  @IsString()
  @IsNotEmpty()
  otp: string;
}