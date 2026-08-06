import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class CreateTaskInstanceDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;
}
