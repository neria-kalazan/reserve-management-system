import { ActivityUserStatusEnum } from '@prisma/client';
import { ActivityUserStatusUserDto } from './activity-user-status-user.dto';

export type ActivityUserStatusValue = 'ACTIVE' | 'HOLIDAY' | 'RELEASED' | 'SICK';
export type ActivityUserAvailabilityValue = 'MORNING' | 'EVENING' | 'ALL_DAY' | 'UNAVAILABLE';

export class ActivityUserStatusItemDto {
  id: string;
  activityId: string;
  userId: string;
  date: Date;
  status: ActivityUserStatusEnum;
  availability: ActivityUserAvailabilityValue;
  createdAt: Date;
  updatedAt: Date;
  user: ActivityUserStatusUserDto;
}
