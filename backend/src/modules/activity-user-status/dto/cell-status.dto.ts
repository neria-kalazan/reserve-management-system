import { IsDateString, IsEnum, IsNotEmpty } from 'class-validator';

export enum ActivityUserStatusCellValue {
  ACTIVE = 'ACTIVE',
  HOLIDAY = 'HOLIDAY',
  RELEASED = 'RELEASED',
  SICK = 'SICK',
}

export class CreateOrUpdateActivityUserStatusCellDto {
  @IsDateString()
  date: string;

  @IsNotEmpty()
  @IsEnum(ActivityUserStatusCellValue)
  status: ActivityUserStatusCellValue;
}
