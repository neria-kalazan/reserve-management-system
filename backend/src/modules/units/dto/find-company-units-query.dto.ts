import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export const COMPANY_UNIT_SORT_FIELDS = ['name', 'description', 'displayOrder'] as const;
export type CompanyUnitSortField = (typeof COMPANY_UNIT_SORT_FIELDS)[number];
export type CompanyUnitSortOrder = 'asc' | 'desc';

export const COMPANY_UNIT_SORT_FIELD_MAP: Record<CompanyUnitSortField, string> = {
  name: 'name',
  description: 'description',
  displayOrder: 'displayOrder',
};

export class FindCompanyUnitsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 10;

  @IsOptional()
  @IsIn(COMPANY_UNIT_SORT_FIELDS)
  sortBy?: CompanyUnitSortField = 'displayOrder';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: CompanyUnitSortOrder = 'asc';
}
