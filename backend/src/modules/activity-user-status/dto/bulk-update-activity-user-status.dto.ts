import { IsDateString, IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export enum ActivityUserStatusValue {
  ACTIVE = 'ACTIVE',
  HOLIDAY = 'HOLIDAY',
  RELEASED = 'RELEASED',
  SICK = 'SICK',
}

export class BulkUpdateActivityUserStatusDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsEnum(ActivityUserStatusValue)
  status: ActivityUserStatusValue;
}
