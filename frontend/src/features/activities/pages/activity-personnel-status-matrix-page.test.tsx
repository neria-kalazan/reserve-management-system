import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/activities/queries/use-activities', () => ({
  useActivityById: vi.fn(),
  useActivityPersonnelStatusMatrix: vi.fn(),
  useCreateActivityUserStatus: vi.fn(),
  useUpdateActivityUserStatus: vi.fn(),
  useDeleteActivityUserStatus: vi.fn(),
}))

const { navigateMock, useParamsMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  useParamsMock: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: useParamsMock,
  }
})

import {
  useActivityById,
  useActivityPersonnelStatusMatrix,
  useCreateActivityUserStatus,
  useDeleteActivityUserStatus,
  useUpdateActivityUserStatus,
} from '@/features/activities/queries/use-activities'
import { ActivityPersonnelStatusMatrixPage } from '@/features/activities/pages/activity-personnel-status-matrix-page'

const useActivityByIdMock = vi.mocked(useActivityById)
const useActivityPersonnelStatusMatrixMock = vi.mocked(useActivityPersonnelStatusMatrix)
const useCreateActivityUserStatusMock = vi.mocked(useCreateActivityUserStatus)
const useUpdateActivityUserStatusMock = vi.mocked(useUpdateActivityUserStatus)
const useDeleteActivityUserStatusMock = vi.mocked(useDeleteActivityUserStatus)

const activityData = {
  id: 'activity-1',
  companyId: 'company-1',
  name: 'פעילות מבצעית',
  type: 'TRAINING',
  startDate: '2026-08-10T00:00:00.000Z',
  endDate: '2026-08-15T00:00:00.000Z',
  status: 'ACTIVE',
  createdAt: '2026-08-10T00:00:00.000Z',
  updatedAt: '2026-08-10T00:00:00.000Z',
}

const baseMatrixData = {
  activity: { id: 'activity-1', name: 'פעילות מבצעית', companyId: 'company-1', startDate: '2026-08-10', endDate: '2026-08-15' },
  dates: ['2026-08-10'],
  rows: [
    {
      user: { id: 'user-1', firstName: 'אבי', lastName: 'כהן', email: 'avi@example.com' },
      cells: { '2026-08-10': null },
      summary: { activeCount: 0, holidayCount: 0, sickCount: 0, releasedCount: 0, yamam: 0, complete: false },
    },
  ],
  dailySummary: [{ date: '2026-08-10', activeCount: 0, holidayCount: 0, sickCount: 0, releasedCount: 0, yamam: 0 }],
}

describe('ActivityPersonnelStatusMatrixPage', () => {
  beforeEach(() => {
    useActivityByIdMock.mockReset()
    useActivityPersonnelStatusMatrixMock.mockReset()
    useCreateActivityUserStatusMock.mockReset()
    useUpdateActivityUserStatusMock.mockReset()
    useDeleteActivityUserStatusMock.mockReset()
    navigateMock.mockReset()
    useParamsMock.mockReset()
    useParamsMock.mockReturnValue({ activityId: 'activity-1' })
  })

  it('renders compact status glyphs, summary columns, and completeness state from the backend contract', () => {
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: activityData,
    } as never)
    useActivityPersonnelStatusMatrixMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        ...baseMatrixData,
        rows: [
          {
            user: { id: 'user-1', firstName: 'אבי', lastName: 'כהן', email: 'avi@example.com' },
            cells: { '2026-08-10': 'ACTIVE', '2026-08-11': 'HOLIDAY', '2026-08-12': 'RELEASED' },
            summary: { activeCount: 1, holidayCount: 1, sickCount: 0, releasedCount: 1, yamam: 2, complete: false },
          },
        ],
        dates: ['2026-08-10', '2026-08-11', '2026-08-12'],
        dailySummary: [
          { date: '2026-08-10', activeCount: 1, holidayCount: 0, sickCount: 0, releasedCount: 0, yamam: 1 },
          { date: '2026-08-11', activeCount: 0, holidayCount: 1, sickCount: 0, releasedCount: 0, yamam: 1 },
          { date: '2026-08-12', activeCount: 0, holidayCount: 0, sickCount: 0, releasedCount: 1, yamam: 0 },
        ],
      },
    } as never)
    useCreateActivityUserStatusMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() } as never)
    useUpdateActivityUserStatusMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() } as never)
    useDeleteActivityUserStatusMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() } as never)

    render(<ActivityPersonnelStatusMatrixPage />)

    expect(screen.getByLabelText('אזהרה: לא מלא')).toBeDefined()
    expect(screen.getAllByText('פ').length).toBeGreaterThan(0)
    expect(screen.getAllByText('ח').length).toBeGreaterThan(0)
    expect(screen.getAllByText('ש').length).toBeGreaterThan(0)
    expect(screen.getAllByText('פעיל').length).toBeGreaterThan(0)
    expect(screen.getAllByText('חופשה').length).toBeGreaterThan(0)
    expect(screen.getAllByText('ימ\"מ').length).toBeGreaterThan(0)
  })

  it('creates a record when an empty matrix cell is set', async () => {
    const createMutateAsync = vi.fn().mockResolvedValue({ id: 'status-1' })

    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: activityData,
    } as never)
    useActivityPersonnelStatusMatrixMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: baseMatrixData,
    } as never)
    useCreateActivityUserStatusMock.mockReturnValue({
      isPending: false,
      mutateAsync: createMutateAsync,
    } as never)
    useUpdateActivityUserStatusMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    } as never)
    useDeleteActivityUserStatusMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    } as never)

    render(<ActivityPersonnelStatusMatrixPage />)

    const trigger = screen.getByRole('button', { name: 'סטטוס עבור user-1 בתאריך 2026-08-10' })
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('option', { name: 'פעיל' }))

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1))
    expect(createMutateAsync).toHaveBeenCalledWith({
      userId: 'user-1',
      date: '2026-08-10',
      status: 'ACTIVE',
    })
  })

  it('uses update for existing first-date and later-date cells and delete for clearing them', async () => {
    const updateMutateAsync = vi.fn().mockResolvedValue({ id: 'status-1' })
    const deleteMutateAsync = vi.fn().mockResolvedValue({ id: 'status-1' })

    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: activityData,
    } as never)
    useActivityPersonnelStatusMatrixMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        ...baseMatrixData,
        dates: ['2026-11-16', '2026-11-17'],
        rows: [
          {
            user: { id: 'user-1', firstName: 'אבי', lastName: 'כהן', email: 'avi@example.com' },
            cells: { '2026-11-16': 'ACTIVE', '2026-11-17': 'HOLIDAY' },
            summary: { activeCount: 1, holidayCount: 1, sickCount: 0, releasedCount: 0, yamam: 2, complete: false },
          },
        ],
        dailySummary: [
          { date: '2026-11-16', activeCount: 1, holidayCount: 0, sickCount: 0, releasedCount: 0, yamam: 1 },
          { date: '2026-11-17', activeCount: 0, holidayCount: 1, sickCount: 0, releasedCount: 0, yamam: 1 },
        ],
      },
    } as never)
    useCreateActivityUserStatusMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    } as never)
    useUpdateActivityUserStatusMock.mockReturnValue({
      isPending: false,
      mutateAsync: updateMutateAsync,
    } as never)
    useDeleteActivityUserStatusMock.mockReturnValue({
      isPending: false,
      mutateAsync: deleteMutateAsync,
    } as never)

    render(<ActivityPersonnelStatusMatrixPage />)

    fireEvent.click(screen.getByRole('button', { name: 'סטטוס עבור user-1 בתאריך 2026-11-16' }))
    fireEvent.click(screen.getByRole('option', { name: 'חולה' }))

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1))
    expect(updateMutateAsync).toHaveBeenCalledWith({
      userId: 'user-1',
      date: '2026-11-16',
      status: 'SICK',
    })

    fireEvent.click(screen.getByRole('button', { name: 'סטטוס עבור user-1 בתאריך 2026-11-17' }))
    fireEvent.click(screen.getByRole('option', { name: 'ללא' }))

    await waitFor(() => expect(deleteMutateAsync).toHaveBeenCalledTimes(1))
    expect(deleteMutateAsync).toHaveBeenCalledWith({
      userId: 'user-1',
      date: '2026-11-17',
    })
  })

  it('disables interaction while a cell mutation is pending to prevent conflicting updates', () => {
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: activityData,
    } as never)
    useActivityPersonnelStatusMatrixMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: baseMatrixData,
    } as never)
    useCreateActivityUserStatusMock.mockReturnValue({
      isPending: true,
      mutateAsync: vi.fn(),
    } as never)
    useUpdateActivityUserStatusMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    } as never)
    useDeleteActivityUserStatusMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    } as never)

    render(<ActivityPersonnelStatusMatrixPage />)

    expect(screen.getByRole('button', { name: 'סטטוס עבור user-1 בתאריך 2026-08-10' }).getAttribute('disabled')).not.toBeNull()
    expect(screen.getByText('-')).toBeDefined()
  })

  it('marks incomplete rows with a clear visual indicator while complete rows remain distinct', () => {
    useActivityByIdMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: activityData,
    } as never)
    useActivityPersonnelStatusMatrixMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        ...baseMatrixData,
        rows: [
          {
            user: { id: 'user-1', firstName: 'אבי', lastName: 'כהן', email: 'avi@example.com' },
            cells: { '2026-08-10': 'ACTIVE', '2026-08-11': 'HOLIDAY' },
            summary: { activeCount: 1, holidayCount: 1, sickCount: 0, releasedCount: 0, yamam: 2, complete: false },
          },
          {
            user: { id: 'user-2', firstName: 'נועה', lastName: 'לוי', email: 'noa@example.com' },
            cells: { '2026-08-10': 'ACTIVE', '2026-08-11': 'HOLIDAY' },
            summary: { activeCount: 1, holidayCount: 1, sickCount: 0, releasedCount: 0, yamam: 2, complete: true },
          },
        ],
        dates: ['2026-08-10', '2026-08-11'],
        dailySummary: [
          { date: '2026-08-10', activeCount: 1, holidayCount: 0, sickCount: 0, releasedCount: 0, yamam: 1 },
          { date: '2026-08-11', activeCount: 0, holidayCount: 1, sickCount: 0, releasedCount: 0, yamam: 1 },
        ],
      },
    } as never)
    useCreateActivityUserStatusMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() } as never)
    useUpdateActivityUserStatusMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() } as never)
    useDeleteActivityUserStatusMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() } as never)

    render(<ActivityPersonnelStatusMatrixPage />)

    const incompleteRow = screen.getByText('אבי כהן').closest('tr')
    const completeRow = screen.getByText('נועה לוי').closest('tr')

    expect(incompleteRow?.getAttribute('data-complete')).toBe('false')
    expect(completeRow?.getAttribute('data-complete')).toBe('true')
    expect(incompleteRow?.className.includes('bg-warning-soft/5')).toBe(true)
    expect(completeRow?.className.includes('bg-success-soft/10')).toBe(true)
  })
})
