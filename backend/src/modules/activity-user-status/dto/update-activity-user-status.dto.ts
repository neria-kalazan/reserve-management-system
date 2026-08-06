import { IsEnum, IsOptional } from 'class-validator';

export enum ActivityUserStatusValue {
  ACTIVE = 'ACTIVE',
  HOLIDAY = 'HOLIDAY',
  RELEASED = 'RELEASED',
  SICK = 'SICK',
}

export class UpdateActivityUserStatusDto {
  @IsOptional()
  @IsEnum(ActivityUserStatusValue)
  status?: ActivityUserStatusValue;
}
