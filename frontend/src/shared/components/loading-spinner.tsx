import { LoaderCircle } from 'lucide-react'

import { cn } from '@/shared/utils/cn'

type LoadingSpinnerProps = {
  className?: string
}

export function LoadingSpinner({ className }: LoadingSpinnerProps) {
  return <LoaderCircle className={cn('h-5 w-5 animate-spin text-primary', className)} />
}