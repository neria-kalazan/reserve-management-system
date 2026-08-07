import { IsArray, IsDateString, IsEnum, IsNotEmpty, ArrayNotEmpty, IsString } from 'class-validator';

export enum ActivityUserAvailabilityValue {
  MORNING = 'MORNING',
  EVENING = 'EVENING',
  ALL_DAY = 'ALL_DAY',
  UNAVAILABLE = 'UNAVAILABLE',
}

export class BulkUpdateActivityUserStatusDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  userIds: string[];

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsEnum(ActivityUserAvailabilityValue)
  availability: ActivityUserAvailabilityValue;
}
