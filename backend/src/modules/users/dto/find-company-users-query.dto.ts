import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export const COMPANY_USER_SORT_FIELDS = ['firstName', 'lastName', 'personalNumber', 'phone', 'createdAt', 'unitDisplayOrder'] as const;
export type CompanyUserSortField = (typeof COMPANY_USER_SORT_FIELDS)[number];
export type CompanyUserSortOrder = 'asc' | 'desc';

export class FindCompanyUsersQueryDto {
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
  @IsIn(COMPANY_USER_SORT_FIELDS)
  sortBy?: CompanyUserSortField = 'firstName';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: CompanyUserSortOrder = 'asc';
}
