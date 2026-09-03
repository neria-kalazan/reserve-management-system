import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateTaskInstanceDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;
}
