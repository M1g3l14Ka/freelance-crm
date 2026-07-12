import "server-only"

import { cache } from "react"
import { requireUser } from "@/lib/auth-guard"
import { isDemoUserId } from "@/lib/demo"

export const getDashboardContext = cache(async () => {
  const user = await requireUser()
  return {
    user,
    isDemo: user.isDemo || isDemoUserId(user.id),
  }
})
