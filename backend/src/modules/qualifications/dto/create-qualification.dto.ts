import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateQualificationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
