import { AIAnalytics } from "@/widgets/AIAnalytics"
import { getDashboardContext } from "@/lib/dashboard"

export default async function AssistantPage() {
  const { isDemo } = await getDashboardContext()
  return (
    <>
      <div><h1 className="app-page-title">Financial assistant</h1><p className="app-page-description">Ask Gemini for insights about your current CRM data.</p></div>
      <AIAnalytics readOnly={isDemo} />
    </>
  )
}
