import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ActivityTaskList } from '@/features/activities/components/activity-task-list'

describe('ActivityTaskList', () => {
  it('renders task name and description', () => {
    render(
      <ActivityTaskList
        tasks={[
          { id: 'task-1', activityId: 'activity-1', name: 'הכנה', description: 'תיאור משימה' },
        ]}
        isPending={false}
        isError={false}
      />,
    )

    expect(screen.getByText('משימות')).toBeDefined()
    expect(screen.getByText('הכנה')).toBeDefined()
    expect(screen.getByText('תיאור משימה')).toBeDefined()
  })

  it('renders empty state when there are no tasks', () => {
    render(
      <ActivityTaskList
        tasks={[]}
        isPending={false}
        isError={false}
      />,
    )

    expect(screen.getByText('אין משימות להצגה לתעסוקה זו.')).toBeDefined()
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
