import { IsEnum, IsOptional } from 'class-validator';

export enum ActivityUserStatusValue {
  ACTIVE = 'ACTIVE',
  HOLIDAY = 'HOLIDAY',
  RELEASED = 'RELEASED',
  SICK = 'SICK',
}

export enum ActivityUserAvailabilityValue {
  MORNING = 'MORNING',
  EVENING = 'EVENING',
  ALL_DAY = 'ALL_DAY',
  UNAVAILABLE = 'UNAVAILABLE',
}

export class UpdateActivityUserStatusDto {
  @IsOptional()
  @IsEnum(ActivityUserStatusValue)
  status?: ActivityUserStatusValue;

  @IsOptional()
  @IsEnum(ActivityUserAvailabilityValue)
  availability?: ActivityUserAvailabilityValue;
}
