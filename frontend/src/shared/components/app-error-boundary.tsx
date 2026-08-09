import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'

import { ErrorState } from '@/shared/components/error-state'

type AppErrorBoundaryProps = {
  children: ReactNode
}

type AppErrorBoundaryState = {
  hasError: boolean
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application render error', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-svh items-center justify-center bg-background px-4">
          <ErrorState
            title="אירעה תקלה בממשק"
            description="אפשר לרענן את הדף ולנסות שוב. אם התקלה חוזרת, יש לבדוק את יומן השגיאות."
          />
        </div>
      )
    }

    return this.props.children
  }
}