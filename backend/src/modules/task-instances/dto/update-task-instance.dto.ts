import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateTaskInstanceDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;
}
