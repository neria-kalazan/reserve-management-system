import { IsOptional, IsString } from 'class-validator';

export class UpdateActivityTaskDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
