import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class ManpowerRequirementDto {
  @IsBoolean()
  required: boolean;

  @Min(1)
  quantity: number;
}

class RoleRequirementDto {
  @IsString()
  @IsNotEmpty()
  roleId: string;

  @IsBoolean()
  required: boolean;

  @Min(1)
  quantity: number;
}

class QualificationRequirementDto {
  @IsString()
  @IsNotEmpty()
  qualificationId: string;

  @IsBoolean()
  required: boolean;

  @Min(1)
  quantity: number;
}

export class UpdateActivityTaskRequirementsDto {
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ManpowerRequirementDto)
  manpower?: ManpowerRequirementDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleRequirementDto)
  roles?: RoleRequirementDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QualificationRequirementDto)
  qualifications?: QualificationRequirementDto[];
}
