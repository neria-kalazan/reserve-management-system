import {
  CheckCircle2,
  CircleSlash,
  Clock3,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  XCircle,
} from 'lucide-react'

import { Badge } from '@/shared/components/ui/badge'
import { cn } from '@/shared/utils/cn'
import type { ActivityStatus, AvailabilityStatus, DailyStatus, StatusValue } from '@/types/status'

type StatusConfig = {
  label: string
  className: string
  icon: typeof CheckCircle2
}

const statusConfig: Record<StatusValue, StatusConfig> = {
  ACTIVE: {
    label: 'פעיל',
    className: 'border-success/30 bg-success-soft text-success',
    icon: ShieldCheck,
  },
  HOLIDAY: {
    label: 'חופשה',
    className: 'border-warning/30 bg-warning-soft text-warning',
    icon: Clock3,
  },
  RELEASED: {
    label: 'שוחרר',
    className: 'border-info/30 bg-info-soft text-info',
    icon: CheckCircle2,
  },
  SICK: {
    label: 'חולה',
    className: 'border-danger/30 bg-danger-soft text-danger',
    icon: ShieldAlert,
  },
  MORNING: {
    label: 'בוקר',
    className: 'border-info/30 bg-info-soft text-info',
    icon: Clock3,
  },
  EVENING: {
    label: 'ערב',
    className: 'border-primary/30 bg-primary-soft text-primary',
    icon: Clock3,
  },
  ALL_DAY: {
    label: 'כל היום',
    className: 'border-success/30 bg-success-soft text-success',
    icon: CheckCircle2,
  },
  UNAVAILABLE: {
    label: 'לא זמין',
    className: 'border-border-strong bg-border text-muted-foreground',
    icon: CircleSlash,
  },
  DRAFT: {
    label: 'טיוטה',
    className: 'border-border-strong bg-border text-muted-foreground',
    icon: Clock3,
  },
  COMPLETED: {
    label: 'הושלם',
    className: 'border-success/30 bg-success-soft text-success',
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: 'בוטל',
    className: 'border-danger/30 bg-danger-soft text-danger',
    icon: XCircle,
  },
}

type StatusBadgeProps = {
  value: DailyStatus | AvailabilityStatus | ActivityStatus
  className?: string
}

export function StatusBadge({ value, className }: StatusBadgeProps) {
  const config = statusConfig[value]
  const Icon = config.icon

  return (
    <Badge className={cn('gap-1.5 px-2.5 py-1 text-xs font-medium', config.className, className)}>
      <Icon className="h-3.5 w-3.5" />
      <span>{config.label}</span>
    </Badge>
  )
}

export function ValidationBadge({ state, text }: { state: 'error' | 'warning' | 'valid'; text: string }) {
  const config = {
    error: { icon: XCircle, className: 'border-danger/30 bg-danger-soft text-danger' },
    warning: { icon: TriangleAlert, className: 'border-warning/30 bg-warning-soft text-warning' },
    valid: { icon: CheckCircle2, className: 'border-success/30 bg-success-soft text-success' },
  }[state]

  const Icon = config.icon

  return (
    <Badge className={cn('gap-1.5 px-2.5 py-1 text-xs font-medium', config.className)}>
      <Icon className="h-3.5 w-3.5" />
      <span>{text}</span>
    </Badge>
  )
}