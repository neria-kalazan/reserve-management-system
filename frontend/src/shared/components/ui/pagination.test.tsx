import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Pagination } from './pagination'

describe('Pagination', () => {
  it('renders the record range and page-size options', () => {
    render(
      <Pagination
        page={2}
        pageSize={10}
        total={42}
        pageSizeOptions={[10, 25, 50]}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    )

    expect(screen.getByText('מציג 11–20 מתוך 42 רשומות')).toBeDefined()
    expect(screen.getByText('עמוד 2 מתוך 5')).toBeDefined()
    expect(screen.getByLabelText('מספר רשומות לעמוד')).toBeDefined()
    expect(screen.getByRole('option', { name: '10' })).toBeDefined()
    expect(screen.getByRole('option', { name: '25' })).toBeDefined()
    expect(screen.getByRole('option', { name: '50' })).toBeDefined()
  })

  it('renders the empty-state presentation without an invalid range', () => {
    render(
      <Pagination
        page={1}
        pageSize={10}
        total={0}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    )

    expect(screen.getByText('אין רשומות להצגה')).toBeDefined()
    expect(screen.queryByText(/מציג 1–0/)).toBeNull()
  })

  it('disables navigation on first and last pages', () => {
    const { rerender } = render(
      <Pagination
        page={1}
        pageSize={10}
        total={25}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    )

    expect((screen.getByRole('button', { name: 'הקודם' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'הבא' }) as HTMLButtonElement).disabled).toBe(false)

    rerender(
      <Pagination
        page={3}
        pageSize={10}
        total={25}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    )

    expect((screen.getByRole('button', { name: 'הקודם' }) as HTMLButtonElement).disabled).toBe(false)
    expect((screen.getByRole('button', { name: 'הבא' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('calls the page and page-size callbacks with the correct values', () => {
    const onPageChange = vi.fn()
    const onPageSizeChange = vi.fn()

    render(
      <Pagination
        page={2}
        pageSize={10}
        total={100}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'הבא' }))
    expect(onPageChange).toHaveBeenCalledWith(3)

    fireEvent.change(screen.getByLabelText('מספר רשומות לעמוד'), { target: { value: '25' } })
    expect(onPageSizeChange).toHaveBeenCalledWith(25)
  })
})
