export interface RowError {
  row: number;
  reason: string;
}

export interface ImportResultDto {
  created: number;
  failed: number;
  errors: RowError[];
}
