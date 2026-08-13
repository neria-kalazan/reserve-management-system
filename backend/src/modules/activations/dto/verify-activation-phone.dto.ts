import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyActivationPhoneDto {
  @IsString()
  @IsNotEmpty()
  phone: string;
}