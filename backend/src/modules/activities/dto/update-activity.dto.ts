import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ActivityStatusValue } from './create-activity.dto';

export class UpdateActivityDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(ActivityStatusValue)
  status?: ActivityStatusValue;
}
