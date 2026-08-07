import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class BulkCreateTaskInstancesDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsString()
  @IsNotEmpty()
  startTime: string;

  @IsString()
  @IsNotEmpty()
  endTime: string;
}
