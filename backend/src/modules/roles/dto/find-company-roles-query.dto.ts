import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export const COMPANY_ROLE_SORT_FIELDS = ['name', 'description', 'createdAt'] as const;
export type CompanyRoleSortField = (typeof COMPANY_ROLE_SORT_FIELDS)[number];
export type CompanyRoleSortOrder = 'asc' | 'desc';

export class FindCompanyRolesQueryDto {
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
  @IsIn(COMPANY_ROLE_SORT_FIELDS)
  sortBy?: CompanyRoleSortField = 'name';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: CompanyRoleSortOrder = 'asc';
}
