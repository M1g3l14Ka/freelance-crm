import "server-only"

export function actionFailure(operation: string, error: unknown) {
  console.error(`${operation} failed:`, error)
  return { success: false as const, error: "Unable to complete request" }
}
