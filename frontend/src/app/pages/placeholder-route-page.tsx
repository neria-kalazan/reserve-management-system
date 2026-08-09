import { ContentContainer } from '@/app/layout/content-container'
import { PageHeader } from '@/app/layout/page-header'
import { PlaceholderPageContent } from '@/shared/components/placeholder-page'

type PlaceholderRoutePageProps = {
  title: string
  description: string
}

export function PlaceholderRoutePage({ title, description }: PlaceholderRoutePageProps) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <ContentContainer className="space-y-6">
        <PlaceholderPageContent />
      </ContentContainer>
    </>
  )
}
