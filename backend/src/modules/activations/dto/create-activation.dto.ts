import { IsUUID } from 'class-validator';

export class CreateActivationDto {
  @IsUUID()
  userId: string;
}