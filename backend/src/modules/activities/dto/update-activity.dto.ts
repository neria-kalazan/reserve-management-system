import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ActivityStatusValue, ActivityTypeValue } from './create-activity.dto';

export class UpdateActivityDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(ActivityTypeValue)
  type?: ActivityTypeValue;

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
