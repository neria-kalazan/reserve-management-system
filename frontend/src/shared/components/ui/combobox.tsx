import { Search } from 'lucide-react'

import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/utils/cn'

export interface ComboboxOption {
  value: string
  label: string
}

type ComboboxProps = {
  value?: string
  placeholder?: string
  options: ComboboxOption[]
  onChange?: (value: string) => void
  className?: string
}

export function Combobox({ value, placeholder = 'בחירה', options, onChange, className }: ComboboxProps) {
  return (
    <div className={cn('rounded-md border border-border bg-surface', className)}>
      <div className="relative border-b border-border">
        <Search className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          value={value ?? ''}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder}
          className="border-0 bg-transparent pr-9 shadow-none focus-visible:ring-0"
        />
      </div>
      <div className="max-h-56 overflow-auto p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className="flex w-full items-center rounded-sm px-3 py-2 text-sm text-foreground hover:bg-surface-elevated"
            onClick={() => onChange?.(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}