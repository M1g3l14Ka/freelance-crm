import "server-only"

export function getDemoUserId(): string | null {
  return process.env.DEMO_USER_ID?.trim() || null
}

export function isDemoUserId(userId: string): boolean {
  const demoUserId = getDemoUserId()
  return demoUserId !== null && userId === demoUserId
}

export class ReadOnlyDemoError extends Error {
  readonly code = "DEMO_READ_ONLY"

  constructor() {
    super("Demo workspace is read-only")
    this.name = "ReadOnlyDemoError"
  }
}
