import "server-only"

import { auth } from "@/lib/auth"
import { isDemoUserId, ReadOnlyDemoError } from "@/lib/demo"

export class AuthenticationRequiredError extends Error {
  readonly code = "AUTHENTICATION_REQUIRED"

  constructor() {
    super("Unauthorized")
    this.name = "AuthenticationRequiredError"
  }
}

export async function requireUser() {
  const session = await auth()

  if (!session?.user?.id) {
    throw new AuthenticationRequiredError()
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
