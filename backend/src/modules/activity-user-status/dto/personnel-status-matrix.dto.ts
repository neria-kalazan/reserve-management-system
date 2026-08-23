export type PersonnelStatusMatrixValue = 'ACTIVE' | 'HOLIDAY' | 'SICK' | 'RELEASED';

export class PersonnelStatusMatrixActivityDto {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  companyId: string;
}

export class PersonnelStatusMatrixUserDto {
  id: string;
  firstName: string | null;
  lastName: string | null;
  personalNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive: boolean;
}

export class PersonnelStatusMatrixRowSummaryDto {
  activeCount: number;
  holidayCount: number;
  sickCount: number;
  releasedCount: number;
  yamam: number;
  complete: boolean;
}

export class PersonnelStatusMatrixRowDto {
  user: PersonnelStatusMatrixUserDto;
  cells: Record<string, PersonnelStatusMatrixValue | null>;
  summary: PersonnelStatusMatrixRowSummaryDto;
}

export class PersonnelStatusMatrixDailySummaryDto {
  date: string;
  activeCount: number;
  holidayCount: number;
  sickCount: number;
  releasedCount: number;
  yamam: number;
}

export class PersonnelStatusMatrixResponseDto {
  activity: PersonnelStatusMatrixActivityDto;
  dates: string[];
  rows: PersonnelStatusMatrixRowDto[];
  dailySummary: PersonnelStatusMatrixDailySummaryDto[];
}
