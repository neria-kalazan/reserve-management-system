import { IsDateString, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class UpdateTaskInstanceDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;
}
