import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateActivityTaskDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
