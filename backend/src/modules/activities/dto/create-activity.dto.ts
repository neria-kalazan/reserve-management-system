import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum ActivityStatusValue {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ActivityTypeValue {
  TRAINING = 'TRAINING',
  EMPLOYMENT = 'EMPLOYMENT',
  TRAINING_COURSE = 'TRAINING_COURSE',
}

export class CreateActivityDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ActivityTypeValue)
  type: ActivityTypeValue;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsEnum(ActivityStatusValue)
  status?: ActivityStatusValue;
}
