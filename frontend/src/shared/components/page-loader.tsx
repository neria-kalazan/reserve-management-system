import { LoadingState } from '@/shared/components/loading-state'

export function PageLoader() {
  return (
    <div className="flex min-h-[50svh] items-center justify-center px-4">
      <LoadingState title="טוען עמוד" description="המערכת מכינה את מסך העבודה." className="w-full max-w-xl" />
    </div>
  )
}