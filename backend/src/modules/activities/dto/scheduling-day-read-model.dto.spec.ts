import { SchedulingDayResponseDto } from './scheduling-day-read-model.dto';

describe('SchedulingDayResponseDto contract', () => {
  it('supports manpower-only tasks with empty assignment slots', () => {
    const payload: SchedulingDayResponseDto = {
      activity: {
        id: 'activity-1',
        companyId: 'company-1',
        name: 'Ops Day',
        status: 'ACTIVE',
        startDate: new Date('2026-09-01T00:00:00.000Z'),
        endDate: new Date('2026-09-10T00:00:00.000Z'),
      },
      date: '2026-09-03',
      isDayOpened: true,
      schedulingStatus: 'DRAFT',
      taskInstances: [
        {
          id: 'instance-1',
          activityTaskId: 'task-1',
          activityTask: {
            id: 'task-1',
            name: 'Gate Guard',
            description: null,
          },
          title: 'Gate Guard Morning',
          startTime: new Date('2026-09-03T06:00:00.000Z'),
          endTime: new Date('2026-09-03T14:00:00.000Z'),
          isOvernight: false,
          requirements: {
            manpower: {
              required: true,
              quantity: 2,
            },
            roles: [],
            qualifications: [],
          },
          assignmentSlots: {
            total: 2,
            filled: 0,
            unfilled: 2,
          },
          assignments: [],
          validation: {
            requiredErrors: [{ type: 'MANPOWER', message: 'Missing required manpower' }],
            warnings: [],
            summary: { isValid: false },
          },
        },
      ],
    };

    expect(payload.isDayOpened).toBe(true);
    expect(payload.taskInstances[0].requirements.manpower?.quantity).toBe(2);
    expect(payload.taskInstances[0].assignmentSlots.unfilled).toBe(2);
    expect(payload.taskInstances[0].validation.requiredErrors[0]?.type).toBe('MANPOWER');
  });

  it('supports role and qualification requirements with required and optional flags plus assignment warnings', () => {
    const payload: SchedulingDayResponseDto = {
      activity: {
        id: 'activity-1',
        companyId: 'company-1',
        name: 'Ops Day',
        status: 'ACTIVE',
        startDate: new Date('2026-09-01T00:00:00.000Z'),
        endDate: new Date('2026-09-10T00:00:00.000Z'),
      },
      date: '2026-09-03',
      isDayOpened: true,
      schedulingStatus: 'PENDING_APPROVAL',
      taskInstances: [
        {
          id: 'instance-2',
          activityTaskId: 'task-2',
          activityTask: {
            id: 'task-2',
            name: 'Patrol',
            description: 'Sector patrol',
          },
          title: 'Patrol Alpha',
          startTime: new Date('2026-09-03T14:00:00.000Z'),
          endTime: new Date('2026-09-03T22:00:00.000Z'),
          isOvernight: false,
          requirements: {
            manpower: {
              required: true,
              quantity: 3,
            },
            roles: [
              {
                roleId: 'role-commander',
                roleName: 'Commander',
                required: true,
                quantity: 1,
              },
              {
                roleId: 'role-driver',
                roleName: 'Driver',
                required: false,
                quantity: 1,
              },
            ],
            qualifications: [
              {
                qualificationId: 'qual-medic',
                qualificationName: 'Medic',
                required: true,
                quantity: 1,
              },
              {
                qualificationId: 'qual-radio',
                qualificationName: 'Radio',
                required: false,
                quantity: 1,
              },
            ],
          },
          assignmentSlots: {
            total: 3,
            filled: 2,
            unfilled: 1,
          },
          assignments: [
            {
              id: 'assignment-1',
              taskInstanceId: 'instance-2',
              userId: 'user-1',
              createdBy: null,
              createdAt: new Date('2026-09-03T10:00:00.000Z'),
              updatedAt: new Date('2026-09-03T10:00:00.000Z'),
              user: {
                id: 'user-1',
                firstName: 'Ada',
                lastName: 'Lovelace',
                personalNumber: '1001',
                phone: '0500000001',
                email: 'ada@example.com',
                isActive: true,
                unit: {
                  id: 'unit-1',
                  name: 'Platoon A',
                },
              },
              availability: {
                status: 'ACTIVE',
                availability: 'MORNING',
              },
              evaluation: {
                userId: 'user-1',
                severity: 'WARNING',
                reasonCodes: ['UNAVAILABLE_FOR_TIME_WINDOW'],
                reasonMessages: ['User is not available for this task time'],
                reasons: [
                  {
                    code: 'UNAVAILABLE_FOR_TIME_WINDOW',
                    severity: 'WARNING',
                    message: 'User is not available for this task time',
                  },
                ],
              },
            },
            {
              id: 'assignment-2',
              taskInstanceId: 'instance-2',
              userId: 'user-2',
              createdBy: 'planner-1',
              createdAt: new Date('2026-09-03T10:05:00.000Z'),
              updatedAt: new Date('2026-09-03T10:05:00.000Z'),
              user: {
                id: 'user-2',
                firstName: 'Grace',
                lastName: 'Hopper',
                personalNumber: '1002',
                phone: null,
                email: null,
                isActive: true,
                unit: null,
              },
              evaluation: {
                userId: 'user-2',
                severity: 'CRITICAL',
                reasonCodes: [
                  'MISSING_REQUIRED_ROLE',
                  'MISSING_OPTIONAL_ROLE',
                  'MISSING_REQUIRED_QUALIFICATION',
                  'MISSING_OPTIONAL_QUALIFICATION',
                ],
                reasonMessages: [
                  'User is missing a required role',
                  'User is missing an optional role',
                  'User is missing a required qualification',
                  'User is missing an optional qualification',
                ],
                reasons: [
                  {
                    code: 'MISSING_REQUIRED_ROLE',
                    severity: 'CRITICAL',
                    message: 'User is missing a required role',
                    roleId: 'role-commander',
                    roleName: 'Commander',
                  },
                  {
                    code: 'MISSING_OPTIONAL_ROLE',
                    severity: 'WARNING',
                    message: 'User is missing an optional role',
                    roleId: 'role-driver',
                    roleName: 'Driver',
                  },
                  {
                    code: 'MISSING_REQUIRED_QUALIFICATION',
                    severity: 'CRITICAL',
                    message: 'User is missing a required qualification',
                    qualificationId: 'qual-medic',
                    qualificationName: 'Medic',
                  },
                  {
                    code: 'MISSING_OPTIONAL_QUALIFICATION',
                    severity: 'WARNING',
                    message: 'User is missing an optional qualification',
                    qualificationId: 'qual-radio',
                    qualificationName: 'Radio',
                  },
                ],
              },
            },
          ],
          validation: {
            requiredErrors: [
              { type: 'ROLE', message: 'Missing required role' },
              { type: 'QUALIFICATION', message: 'Missing required qualification' },
            ],
            warnings: [
              { type: 'AVAILABILITY', message: 'User is not available for this task time' },
              { type: 'ROLE', message: 'Optional role requirement is missing' },
            ],
            summary: { isValid: false },
          },
        },
      ],
    };

    const [taskInstance] = payload.taskInstances;
    expect(taskInstance.requirements.roles).toHaveLength(2);
    expect(taskInstance.requirements.roles.find((entry) => entry.roleId === 'role-driver')?.required).toBe(false);
    expect(taskInstance.requirements.qualifications.find((entry) => entry.qualificationId === 'qual-radio')?.required).toBe(false);
    expect(taskInstance.assignments).toHaveLength(2);
    expect(taskInstance.assignments[0]?.evaluation.reasonCodes).toContain('UNAVAILABLE_FOR_TIME_WINDOW');
    expect(taskInstance.assignments[1]?.evaluation.reasons[0]).toEqual({
      code: 'MISSING_REQUIRED_ROLE',
      severity: 'CRITICAL',
      message: 'User is missing a required role',
      roleId: 'role-commander',
      roleName: 'Commander',
    });
    expect(taskInstance.validation.warnings.some((issue) => issue.type === 'AVAILABILITY')).toBe(true);
  });

  it('supports overnight task instances with opened/closed day semantics', () => {
    const openedDayPayload: SchedulingDayResponseDto = {
      activity: {
        id: 'activity-2',
        companyId: 'company-1',
        name: 'Night Ops',
        status: 'ACTIVE',
        startDate: new Date('2026-09-01T00:00:00.000Z'),
        endDate: new Date('2026-09-10T00:00:00.000Z'),
      },
      date: '2026-09-04',
      isDayOpened: true,
      schedulingStatus: 'APPROVED',
      taskInstances: [
        {
          id: 'instance-night-1',
          activityTaskId: 'task-night',
          activityTask: {
            id: 'task-night',
            name: 'Night Patrol',
            description: null,
          },
          title: 'Night Patrol 1',
          startTime: new Date('2026-09-04T22:00:00.000Z'),
          endTime: new Date('2026-09-05T06:00:00.000Z'),
          isOvernight: true,
          requirements: {
            manpower: null,
            roles: [],
            qualifications: [],
          },
          assignmentSlots: {
            total: 0,
            filled: 0,
            unfilled: 0,
          },
          assignments: [],
          validation: {
            requiredErrors: [],
            warnings: [],
            summary: { isValid: true },
          },
        },
      ],
    };

    const closedDayPayload: SchedulingDayResponseDto = {
      ...openedDayPayload,
      date: '2026-09-06',
      isDayOpened: false,
      schedulingStatus: 'DRAFT',
      taskInstances: [],
    };

    expect(openedDayPayload.taskInstances[0]?.isOvernight).toBe(true);
    expect(openedDayPayload.taskInstances[0]?.endTime.getUTCDate()).toBe(5);
    expect(closedDayPayload.isDayOpened).toBe(false);
    expect(closedDayPayload.taskInstances).toHaveLength(0);
  });
});
