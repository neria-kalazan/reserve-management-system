import { IsOptional, IsString } from 'class-validator';

export class UpdateQualificationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
