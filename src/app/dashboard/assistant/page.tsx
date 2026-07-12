import { AIAnalytics } from "@/widgets/AIAnalytics"
import { getDashboardContext } from "@/lib/dashboard"

export default async function AssistantPage() {
  const { isDemo } = await getDashboardContext()
  return (
    <>
      <div><h1 className="text-3xl font-bold">Financial assistant</h1><p className="mt-1 text-sm text-zinc-500">Ask Gemini for insights about your current CRM data.</p></div>
      <AIAnalytics readOnly={isDemo} />
    </>
  )
}
