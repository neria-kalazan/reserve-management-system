import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ActivityTaskList } from '@/features/activities/components/activity-task-list'

describe('ActivityTaskList', () => {
  it('renders task name, description, manpower badge, requirement labels, and a single edit action', () => {
    const onEdit = vi.fn()

    render(
      <ActivityTaskList
        tasks={[
          { id: 'task-1', activityId: 'activity-1', name: 'הכנה', description: 'תיאור משימה' },
        ]}
        isPending={false}
        isError={false}
        onEdit={onEdit}
        taskRequirements={{
          'task-1': {
            manpower: { required: true, quantity: 2 },
            roles: [{ roleId: 'role-1', required: true, quantity: 1 }],
            qualifications: [{ qualificationId: 'qual-1', required: false, quantity: 1 }],
          },
        }}
        roleNames={{ 'role-1': 'מפקד' }}
        qualificationNames={{ 'qual-1': 'רישיון נהיגה' }}
      />,
    )

    expect(screen.getByText('משימות')).toBeDefined()
    expect(screen.getByText('הכנה')).toBeDefined()
    expect(screen.getByText('תיאור משימה')).toBeDefined()
    expect(screen.getByText('סד"כ: 2 לוחמים')).toBeDefined()
    expect(screen.getByText('מפקד')).toBeDefined()
    expect(screen.getByText('רישיון נהיגה')).toBeDefined()
    expect(screen.getByText('הכרחי')).toBeDefined()
    expect(screen.getByText('לא הכרחי')).toBeDefined()
    expect(screen.getByRole('button', { name: 'עריכה' })).toBeDefined()
    expect(screen.queryByText('מופעים')).toBeNull()
    expect(screen.queryByText('דרישות')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'עריכה' }))
    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onEdit).toHaveBeenCalledWith({ id: 'task-1', activityId: 'activity-1', name: 'הכנה', description: 'תיאור משימה' })
  })

  it('renders empty state when there are no tasks', () => {
    render(
      <ActivityTaskList
        tasks={[]}
        isPending={false}
        isError={false}
      />,
    )

    expect(screen.getByText('אין משימות להצגה לפעילות זו.')).toBeDefined()
  })

  it('renders visible empty states when a requirement side is empty', () => {
    render(
      <ActivityTaskList
        tasks={[
          { id: 'task-1', activityId: 'activity-1', name: 'הכנה', description: 'תיאור משימה' },
        ]}
        isPending={false}
        isError={false}
        taskRequirements={{
          'task-1': {
            manpower: { required: true, quantity: 2 },
            roles: [],
            qualifications: [{ qualificationId: 'qual-1', required: false, quantity: 1 }],
          },
        }}
        qualificationNames={{ 'qual-1': 'רישיון נהיגה' }}
      />,
    )

    expect(screen.getByText('אין דרישות תפקידים.')).toBeDefined()
    expect(screen.getByText('רישיון נהיגה')).toBeDefined()
    expect(screen.getByText('לא הכרחי')).toBeDefined()
  })

  it('renders loading state', () => {
    render(
      <ActivityTaskList
        tasks={[]}
        isPending
        isError={false}
      />,
    )

    expect(screen.getByText('טוען משימות')).toBeDefined()
  })

  it('renders error state with retry', () => {
    const refetch = vi.fn()

    render(
      <ActivityTaskList
        tasks={[]}
        isPending={false}
        isError
        error={{ status: 500, message: 'failed' }}
        refetch={refetch}
      />,
    )

    expect(screen.getByText('טעינת המשימות נכשלה')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'ניסיון חוזר' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
