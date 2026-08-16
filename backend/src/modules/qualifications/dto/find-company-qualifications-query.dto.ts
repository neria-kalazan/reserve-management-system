import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export const COMPANY_QUALIFICATION_SORT_FIELDS = ['name', 'description', 'createdAt'] as const;
export type CompanyQualificationSortField = (typeof COMPANY_QUALIFICATION_SORT_FIELDS)[number];
export type CompanyQualificationSortOrder = 'asc' | 'desc';

export const COMPANY_QUALIFICATION_SORT_FIELD_MAP: Record<CompanyQualificationSortField, string> = {
  name: 'name',
  description: 'description',
  createdAt: 'createdAt',
};

export class FindCompanyQualificationsQueryDto {
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
  @IsIn(COMPANY_QUALIFICATION_SORT_FIELDS)
  sortBy?: CompanyQualificationSortField = 'name';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: CompanyQualificationSortOrder = 'asc';
}
