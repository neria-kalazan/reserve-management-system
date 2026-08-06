import { ActivityUserStatusEnum } from '@prisma/client';
import { ActivityUserStatusUserDto } from './activity-user-status-user.dto';

export type ActivityUserStatusValue = 'ACTIVE' | 'HOLIDAY' | 'RELEASED' | 'SICK';

export class ActivityUserStatusItemDto {
  id: string;
  activityId: string;
  userId: string;
  date: Date;
  status: ActivityUserStatusEnum;
  createdAt: Date;
  updatedAt: Date;
  user: ActivityUserStatusUserDto;
}
