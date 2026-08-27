import { ActivityStatus } from '@prisma/client';
import { ActivityUserAvailabilityValue, ActivityUserStatusValue } from '../../activity-user-status/dto/activity-user-status-item.dto';
import { TaskValidationResult } from '../../task-instances/task-validation.service';

export type SchedulingCandidateSeverity = 'NORMAL' | 'WARNING' | 'CRITICAL';

export class SchedulingDayActivityDto {
  id: string;
  companyId: string;
  name: string;
  status: ActivityStatus;
  startDate: Date;
  endDate: Date;
}

export class SchedulingDayTaskDefinitionRefDto {
  id: string;
  name: string;
  description: string | null;
}

export class SchedulingDayManpowerRequirementDto {
  required: boolean;
  quantity: number;
}

export class SchedulingDayRoleRequirementDto {
  roleId: string;
  roleName?: string;
  required: boolean;
  quantity: number;
}

export class SchedulingDayQualificationRequirementDto {
  qualificationId: string;
  qualificationName?: string;
  required: boolean;
  quantity: number;
}

export class SchedulingDayTaskRequirementsDto {
  manpower: SchedulingDayManpowerRequirementDto | null;
  roles: SchedulingDayRoleRequirementDto[];
  qualifications: SchedulingDayQualificationRequirementDto[];
}

export class SchedulingDayAssignmentSlotsDto {
  total: number;
  filled: number;
  unfilled: number;
}

export class SchedulingDayAssignedUserDto {
  id: string;
  firstName: string;
  lastName: string;
  personalNumber: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  unit: {
    id: string;
    name: string;
  } | null;
}

export class SchedulingDayAvailabilitySnapshotDto {
  status: ActivityUserStatusValue;
  availability: ActivityUserAvailabilityValue;
}

export class SchedulingDayCandidateEvaluationDto {
  severity: SchedulingCandidateSeverity;
  reasonCodes: string[];
  reasonMessages: string[];
}

export class SchedulingDayAssignmentDto {
  id: string;
  taskInstanceId: string;
  userId: string;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: SchedulingDayAssignedUserDto;
  availability?: SchedulingDayAvailabilitySnapshotDto;
  evaluation: SchedulingDayCandidateEvaluationDto;
}

export class SchedulingDayTaskInstanceDto {
  id: string;
  activityTaskId: string;
  activityTask: SchedulingDayTaskDefinitionRefDto;
  title: string;
  startTime: Date;
  endTime: Date;
  isOvernight: boolean;
  requirements: SchedulingDayTaskRequirementsDto;
  assignmentSlots: SchedulingDayAssignmentSlotsDto;
  assignments: SchedulingDayAssignmentDto[];
  validation: TaskValidationResult;
}

export class SchedulingDayResponseDto {
  activity: SchedulingDayActivityDto;
  date: string;
  isDayOpened: boolean;
  taskInstances: SchedulingDayTaskInstanceDto[];
}
