import { EmptyState } from '@/shared/components/empty-state'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'

export function PlaceholderPageContent() {
  return (
    <>
      <Alert>
        <AlertTitle>תשתית בלבד</AlertTitle>
        <AlertDescription>
          במסך זה הוקמה תשתית ניווט, עיצוב ומבנה בלבד. מימוש עסקי יתווסף ב-EPIC המתאים.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>מסגרת אחידה למסכים עתידיים</CardTitle>
            <CardDescription>
              היישום משתמש במעטפת משותפת, בעיצוב כהה עקבי ובתשתית RTL מלאה לטובת פיתוח כל המסכים הבאים.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              title="אין תוכן עסקי בשלב זה"
              description="זהו מסך מציין מקום בלבד, שמאפשר לוודא ניתוב, מעטפת, רספונסיביות ורכיבי עיצוב משותפים."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>מה כבר מוכן</CardTitle>
            <CardDescription>היסודות הטכניים והחזותיים זמינים לכל EPIC עתידי.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted">
            <p>React Router עם מסלולים מוכנים להרחבה</p>
            <p>TanStack Query ו-Axios לשכבת תקשורת</p>
            <p>רכיבי UI משותפים, טעינה, שגיאה וסטטוסים</p>
            <p>מעטפת מובייל ודסקטופ עקבית עם ניווט צד</p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}