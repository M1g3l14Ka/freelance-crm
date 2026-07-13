export type DateValue = Date | string | number

const INVALID_DATE_LABEL = "—"

function toValidDate(value: DateValue): Date | null {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isFinite(date.getTime()) ? date : null
}

export function formatUtcDate(value: DateValue): string {
  const date = toValidDate(value)
  if (!date) return INVALID_DATE_LABEL

  const day = String(date.getUTCDate()).padStart(2, "0")
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  return `${day}.${month}.${date.getUTCFullYear()}`
}

export function serializeUtcTimestamp(value: Date): string {
  return toValidDate(value)?.toISOString() ?? ""
}
