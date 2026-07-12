import "server-only"

import { auth } from "@/lib/auth"
import { isDemoUserId, ReadOnlyDemoError } from "@/lib/demo"

export async function requireUser() {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  return session.user
}

export async function requireWritableUser() {
  const user = await requireUser()

  if (user.isDemo || isDemoUserId(user.id)) {
    throw new ReadOnlyDemoError()
  }

  return user
}
